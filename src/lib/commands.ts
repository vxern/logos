import { getDiscordLanguageByLocale } from "../constants/languages/localisation";
import { capitalise } from "../formatting";
import { isDefined } from "../utilities";
import { Client } from "./client";
import {
	Command,
	OptionMetadata,
	CommandTemplate,
	InteractionHandler,
	Option,
	OptionTemplate,
} from "./commands/command";
import commandTemplates from "./commands/commands";
import { Guild, timeStructToMilliseconds } from "./database/guild";
import { DescriptionLocalisations, LocalisationStore, NameLocalisations } from "./localisations";
import { Logger } from "./logger";

interface RateLimit {
	nextAllowedUsageTimestamp: number;
}
type CommandName = keyof typeof commandTemplates;
type LocalisedNamesWithMetadata = [names: NameLocalisations, metadata: OptionMetadata];
type BuildResult<Object extends Command | Option> = [object: Object, namesWithFlags: LocalisedNamesWithMetadata[]];
class CommandStore {
	readonly commands: Partial<Record<CommandName, Command>>;

	readonly #log: Logger;
	readonly #client: Client;
	readonly #collection: {
		readonly showable: Set<string>;
		readonly withRateLimit: Set<string>;
	};
	// The keys are member IDs, the values are command usage timestamps mapped by command IDs.
	readonly #lastCommandUseTimestamps: Map<bigint, Map<bigint, number[]>>;
	readonly #handlers: {
		readonly execute: Map<string, InteractionHandler>;
		readonly autocomplete: Map<string, InteractionHandler>;
	};

	readonly #_defaultCommands: Command[];

	private constructor(
		client: Client,
		{
			log,
			commands,
			showable,
			withRateLimit,
			executeHandlers,
			autocompleteHandlers,
		}: {
			log: Logger;
			commands: Partial<Record<CommandName, Command>>;
			showable: Set<string>;
			withRateLimit: Set<string>;
			executeHandlers: Map<string, InteractionHandler>;
			autocompleteHandlers: Map<string, InteractionHandler>;
		},
	) {
		this.commands = commands;

		this.#log = log;
		this.#client = client;
		this.#collection = { showable, withRateLimit };
		this.#lastCommandUseTimestamps = new Map();
		this.#handlers = { execute: executeHandlers, autocomplete: autocompleteHandlers };

		this.#_defaultCommands = [
			this.commands.information,
			this.commands.acknowledgements,
			this.commands.credits,
			this.commands.licence,
			this.commands.settings,
			this.commands.recognise,
			this.commands.recogniseMessage,
		].filter(isDefined);
	}

	static create(
		client: Client,
		{
			localisations,
			templates,
		}: {
			localisations: LocalisationStore;
			templates: CommandTemplate[];
		},
	): CommandStore {
		const log = Logger.create({ identifier: "Client/InteractionStore", isDebug: client.environment.isDebug });

		// Build commands from templates.
		const commandsByName: Partial<Record<CommandName, Command>> = {};
		const namesWithMetadata: LocalisedNamesWithMetadata[] = [];
		for (const template of templates) {
			const result = CommandStore.build({ localisations, template });
			if (result === undefined) {
				continue;
			}

			const [command, namesWithMetadataPart] = result;

			// TODO(vxern): This needs to be documented somewhere.
			// TODO(vxern): This could also be done better.
			const nameParts = template.id.replace(".message", "Message").split(".options.");
			const commandName = [nameParts.at(0)!, ...nameParts.slice(1).map((part) => capitalise(part))]
				.join("")
				.replace("recognize", "recognise")
				.replace("license", "licence");

			commandsByName[commandName as CommandName] = command;
			namesWithMetadata.push(...namesWithMetadataPart);
		}

		// Check for duplicates.
		const nameBuffers: Partial<Record<Discord.Locales, Set<string>>> = {};
		const commandMetadataByDisplayName = new Map<string, OptionMetadata>();
		for (const [nameLocalisations, metadata] of namesWithMetadata) {
			const { name, nameLocalizations } = nameLocalisations;

			if (commandMetadataByDisplayName.has(name)) {
				log.warn(`Duplicate command "${name}". Skipping addition...`);
				continue;
			}

			if (nameLocalizations === undefined) {
				commandMetadataByDisplayName.set(name, metadata);
				continue;
			}

			for (const [locale, name] of Object.entries(nameLocalizations) as [Discord.Locales, string][]) {
				if (!(locale in nameBuffers)) {
					nameBuffers[locale] = new Set([name]);
					continue;
				}

				const buffer = nameBuffers[locale]!;
				if (buffer.has(name)) {
					const language = getDiscordLanguageByLocale(locale)!;
					log.warn(`Duplicate command "${name}" in ${language}. Skipping addition...`);
					delete nameLocalizations[locale];
					continue;
				}

				buffer.add(locale);
			}

			commandMetadataByDisplayName.set(name, metadata);
		}

		// Declare commands by their flags.
		const showable = new Set<string>();
		const withRateLimit = new Set<string>();
		for (const [nameLocalisations, metadata] of namesWithMetadata) {
			if (metadata.flags?.isShowable ?? false) {
				showable.add(nameLocalisations.name);
			}

			if (metadata.flags?.hasRateLimit ?? false) {
				withRateLimit.add(nameLocalisations.name);
			}
		}

		// Register handlers.
		const executeHandlers = new Map<string, InteractionHandler>();
		const autocompleteHandlers = new Map<string, InteractionHandler>();
		for (const [nameLocalisations, metadata] of namesWithMetadata) {
			if (metadata.handle !== undefined) {
				executeHandlers.set(nameLocalisations.name, metadata.handle);
			}

			if (metadata.handleAutocomplete !== undefined) {
				autocompleteHandlers.set(nameLocalisations.name, metadata.handleAutocomplete);
			}
		}

		return new CommandStore(client, {
			log,
			commands: commandsByName,
			showable,
			withRateLimit,
			executeHandlers,
			autocompleteHandlers,
		});
	}

	static build(_: { localisations: LocalisationStore; template: CommandTemplate; keyPrefix?: string }):
		| BuildResult<Command>
		| undefined;
	static build(_: { localisations: LocalisationStore; template: OptionTemplate; keyPrefix?: string }):
		| BuildResult<Option>
		| undefined;
	static build({
		localisations,
		template,
		keyPrefix,
	}: { localisations: LocalisationStore; template: CommandTemplate | OptionTemplate; keyPrefix?: string }):
		| BuildResult<Command | Option>
		| undefined {
		let key: string;
		if (keyPrefix !== undefined) {
			key = `${keyPrefix}.options.${template.id}`;
		} else {
			key = template.id;
		}

		const nameLocalisations = localisations.buildNameLocalisations({ key });
		if (nameLocalisations === undefined) {
			return undefined;
		}

		const descriptionLocalisations = localisations.buildDescriptionLocalisations({ key });
		if (descriptionLocalisations === undefined) {
			return undefined;
		}

		if (template.options === undefined || template.options.length === 0) {
			const localisedNamesWithMetadata: LocalisedNamesWithMetadata = [nameLocalisations, template];

			let object: Discord.CreateApplicationCommand | Discord.ApplicationCommandOption;
			if (keyPrefix !== undefined) {
				object = CommandStore.buildOption({
					template: template as OptionTemplate,
					nameLocalisations,
					descriptionLocalisations,
				});
			} else {
				object = CommandStore.buildCommand({
					template: template as CommandTemplate,
					nameLocalisations,
					descriptionLocalisations,
				});
			}

			return [object, [localisedNamesWithMetadata]];
		}

		const optionTemplates = template.options;

		const options: Option[] = [];
		const namesWithMetadata: LocalisedNamesWithMetadata[] = [];
		for (const template of optionTemplates) {
			const result = CommandStore.build({ localisations, template, keyPrefix: key });
			if (result === undefined) {
				continue;
			}

			const [option, namesWithMetadataPart] = result;

			options.push(option);

			if (
				!(
					option.type === Discord.ApplicationCommandOptionTypes.SubCommand ||
					option.type === Discord.ApplicationCommandOptionTypes.SubCommandGroup
				)
			) {
				continue;
			}

			// Take the localised name object and replicate it, only prefixed with the option localised names.
			//
			// In practice, this process turns the following example:
			// [
			//   { name: "open", nameLocalizations: { "pl": "otwórz", "ro": "deschide" } },
			//   { name: "close", nameLocalizations: { "pl": "zamknij", "ro": "închide" } },
			// ]
			// Into:
			// [
			//   { name: "channel open", nameLocalizations: { "pl": "kanał otwórz", "ro": "canal deschide" } },
			//   { name: "channel close", nameLocalizations: { "pl": "kanał zamknij", "ro": "canal închide" } },
			// ]
			for (const [optionNameLocalisations, metadata] of namesWithMetadataPart) {
				const commandNamesLocalised: Partial<Record<Discord.Locales, string>> = {};
				for (const [locale, string] of Object.entries(commandNamesLocalised) as [Discord.Locales, string][]) {
					const localisedName = optionNameLocalisations.nameLocalizations?.[locale] ?? optionNameLocalisations.name;
					commandNamesLocalised[locale] = `${string} ${localisedName}`;
				}

				namesWithMetadata.push([
					{
						name: `${nameLocalisations.name} ${optionNameLocalisations.name}`,
						nameLocalizations: commandNamesLocalised,
					},
					metadata,
				]);
			}
		}

		namesWithMetadata.push([nameLocalisations, template]);

		let object: Discord.CreateApplicationCommand | Discord.ApplicationCommandOption;
		if (keyPrefix !== undefined) {
			object = CommandStore.buildOption({
				template: template as OptionTemplate,
				nameLocalisations,
				descriptionLocalisations,
				options,
			});
		} else {
			object = CommandStore.buildCommand({
				template: template as CommandTemplate,
				nameLocalisations,
				descriptionLocalisations,
				options,
			});
		}

		return [object, namesWithMetadata];
	}

	static buildCommand({
		template,
		nameLocalisations,
		descriptionLocalisations,
		options,
	}: {
		template: CommandTemplate;
		nameLocalisations: NameLocalisations;
		descriptionLocalisations: DescriptionLocalisations;
		options?: Option[];
	}): Command {
		if (template.type === Discord.ApplicationCommandTypes.ChatInput) {
			return {
				...nameLocalisations,
				...descriptionLocalisations,
				type: template.type,
				defaultMemberPermissions: template.defaultMemberPermissions,
				options,
			};
		}

		return {
			...nameLocalisations,
			type: template.type,
			defaultMemberPermissions: template.defaultMemberPermissions,
			options,
		};
	}

	static buildOption({
		template,
		nameLocalisations,
		descriptionLocalisations,
		options,
	}: {
		template: OptionTemplate;
		nameLocalisations: NameLocalisations;
		descriptionLocalisations: DescriptionLocalisations;
		options?: Option[];
	}): Option {
		return {
			...nameLocalisations,
			...descriptionLocalisations,
			type: template.type,
			required: template.required,
			channelTypes: template.channelTypes,
			minValue: template.minValue,
			maxValue: template.maxValue,
			minLength: template.minLength,
			maxLength: template.maxLength,
			autocomplete: template.autocomplete,
			choices: template.choices,
			options,
		};
	}

	getHandler(interaction: Logos.Interaction): InteractionHandler | undefined {
		if (isAutocomplete(interaction)) {
			return this.#handlers.autocomplete.get(interaction.commandName);
		}

		return this.#handlers.execute.get(interaction.commandName);
	}

	isShowable(interaction: Logos.Interaction) {
		return this.#collection.showable.has(interaction.commandName);
	}

	hasRateLimit(interaction: Logos.Interaction) {
		return this.#collection.withRateLimit.has(interaction.commandName);
	}

	getEnabledCommands(guildDocument: Guild): Command[] {
		const commands: (Command | undefined)[] = [];

		if (guildDocument.areEnabled("languageFeatures")) {
			if (guildDocument.areEnabled("answers")) {
				commands.push(this.commands.answerMessage);
			}

			if (guildDocument.areEnabled("corrections")) {
				commands.push(this.commands.correctionFullMessage, this.commands.correctionPartialMessage);
			}

			if (guildDocument.isEnabled("cefr")) {
				commands.push(this.commands.cefr);
			}

			if (guildDocument.isEnabled("game")) {
				commands.push(this.commands.game);
			}

			if (guildDocument.areEnabled("resources")) {
				commands.push(this.commands.resources);
			}

			if (guildDocument.areEnabled("translate")) {
				commands.push(this.commands.translate, this.commands.translateMessage);
			}

			if (guildDocument.isEnabled("word")) {
				// TODO(vxern): Re-enable
				// commands.push(this.commands.word);
			}
		}

		if (guildDocument.areEnabled("moderationFeatures")) {
			commands.push(this.commands.list);

			if (guildDocument.isEnabled("policy")) {
				commands.push(this.commands.policy);
			}

			if (guildDocument.areEnabled("rules")) {
				commands.push(this.commands.rule);
			}

			if (guildDocument.isEnabled("slowmode")) {
				commands.push(this.commands.slowmode);
			}

			if (guildDocument.areEnabled("timeouts")) {
				commands.push(this.commands.timeout);
			}

			if (guildDocument.isEnabled("purging")) {
				commands.push(this.commands.purge);
			}

			if (guildDocument.areEnabled("warns")) {
				commands.push(this.commands.warn, this.commands.pardon);
			}

			if (guildDocument.areEnabled("reports")) {
				commands.push(this.commands.report);
			}
		}

		if (guildDocument.areEnabled("serverFeatures")) {
			if (guildDocument.areEnabled("suggestions")) {
				commands.push(this.commands.suggestion);
			}

			if (guildDocument.areEnabled("tickets")) {
				commands.push(this.commands.ticket);
			}

			if (guildDocument.areEnabled("resources")) {
				commands.push(this.commands.resource);
			}
		}

		if (guildDocument.areEnabled("socialFeatures")) {
			if (guildDocument.isEnabled("music")) {
				commands.push(this.commands.music);
			}

			if (guildDocument.isEnabled("praises")) {
				commands.push(this.commands.praise);
			}

			if (guildDocument.isEnabled("profile")) {
				commands.push(this.commands.profile);
			}
		}

		return [...this.#_defaultCommands, ...commands.filter(isDefined)];
	}

	#getLastCommandUseTimestamps({
		memberId,
		commandId,
		executedAt,
		intervalMilliseconds,
	}: { memberId: bigint; commandId: bigint; executedAt: number; intervalMilliseconds: number }): number[] {
		if (!this.#lastCommandUseTimestamps.has(memberId)) {
			return [];
		}

		const lastCommandUseTimestamps = this.#lastCommandUseTimestamps.get(memberId)!;
		if (!lastCommandUseTimestamps.has(commandId)) {
			return [];
		}

		const lastUseTimestamps = lastCommandUseTimestamps.get(commandId)!;
		const relevantTimestamps = lastUseTimestamps.filter((timestamp) => executedAt - timestamp <= intervalMilliseconds);

		return relevantTimestamps;
	}

	getRateLimit(interaction: Logos.Interaction, { executedAt }: { executedAt: number }): RateLimit | undefined {
		const commandId = interaction.data?.id;
		if (commandId === undefined) {
			return undefined;
		}

		const intervalMilliseconds = timeStructToMilliseconds(defaults.COMMAND_RATE_LIMIT.within);

		const memberId = this.#client.bot.transformers.snowflake(`${interaction.user.id}${interaction.guildId}`);

		const timestamps = this.#getLastCommandUseTimestamps({
			memberId,
			commandId,
			executedAt,
			intervalMilliseconds,
		});

		if (timestamps.length + 1 > defaults.COMMAND_RATE_LIMIT.uses) {
			const lastTimestamp = timestamps.at(0);
			if (lastTimestamp === undefined) {
				throw "StateError: Unexpectedly undefined initial timestamp.";
			}

			const nextAllowedUsageTimestamp = intervalMilliseconds - executedAt - lastTimestamp;

			return { nextAllowedUsageTimestamp };
		}

		const lastCommandUseTimestampsForMember = this.#lastCommandUseTimestamps.get(memberId);
		if (lastCommandUseTimestampsForMember === undefined) {
			this.#lastCommandUseTimestamps.set(memberId, new Map([[commandId, [executedAt]]]));
			return undefined;
		}

		const lastTimestamps = lastCommandUseTimestampsForMember.get(commandId);
		if (lastTimestamps === undefined) {
			lastCommandUseTimestampsForMember.set(commandId, [executedAt]);
			return undefined;
		}

		lastTimestamps.push(executedAt);

		return undefined;
	}
}

type AutocompleteInteraction = (Discord.Interaction | Logos.Interaction) & {
	type: Discord.InteractionTypes.ApplicationCommandAutocomplete;
};

function isAutocomplete(interaction: Discord.Interaction | Logos.Interaction): interaction is AutocompleteInteraction {
	return interaction.type === Discord.InteractionTypes.ApplicationCommandAutocomplete;
}

function isSubcommandGroup(option: Discord.InteractionDataOption): boolean {
	return option.type === Discord.ApplicationCommandOptionTypes.SubCommandGroup;
}

function isSubcommand(option: Discord.InteractionDataOption): boolean {
	return option.type === Discord.ApplicationCommandOptionTypes.SubCommand;
}

export { CommandStore, isAutocomplete, isSubcommandGroup, isSubcommand };
