import { isAutocomplete } from "logos:constants/interactions";
import { getDiscordLanguageByLocale } from "logos:constants/languages/localisation";
import { timeStructToMilliseconds } from "logos:constants/time";
import { isDefined } from "logos:core/utilities";
import type { Client } from "logos/client";
import type {
	BuiltCommand,
	BuiltCommands,
	Command,
	CommandBuilder,
	CommandName,
	CommandTemplate,
	CommandTemplates,
	Option,
	OptionBuilder,
	OptionMetadata,
	OptionTemplate,
} from "logos/commands/commands";
import type { InteractionHandler } from "logos/commands/handlers/handler";
import { Logger } from "logos/logger";
import type { Guild } from "logos/models/guild";
import type { DescriptionLocalisations, LocalisationStore, NameLocalisations } from "logos/stores/localisations";

interface RateLimit {
	nextAllowedUsageTimestamp: number;
}
type LocalisedNamesWithMetadata = [names: NameLocalisations, metadata: OptionMetadata];
type BuildResult<Object extends Command | Option> = {
	key: string;
	built: Object;
	namesWithMetadata: LocalisedNamesWithMetadata[];
};
class CommandStore {
	readonly commands: BuiltCommands;

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
	readonly #defaultCommands: BuiltCommand[];

	constructor(
		client: Client,
		{
			commands,
			showable,
			withRateLimit,
			executeHandlers,
			autocompleteHandlers,
		}: {
			commands: BuiltCommands;
			showable: Set<string>;
			withRateLimit: Set<string>;
			executeHandlers: Map<string, InteractionHandler>;
			autocompleteHandlers: Map<string, InteractionHandler>;
		},
	) {
		this.commands = commands;

		this.#client = client;
		this.#collection = { showable, withRateLimit };
		this.#lastCommandUseTimestamps = new Map();
		this.#handlers = { execute: executeHandlers, autocomplete: autocompleteHandlers };
		this.#defaultCommands = [
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
			templates: CommandTemplates;
		},
	): CommandStore {
		const log = Logger.create({ identifier: "Client/CommandStore", isDebug: client.environment.isDebug });

		// Build commands from templates.
		const commands: Partial<BuiltCommands> = {};
		const namesWithMetadata: LocalisedNamesWithMetadata[] = [];
		for (const [identifier, template] of Object.entries(templates) as [CommandName, CommandTemplate][]) {
			const result = CommandStore.build({ localisations, template });
			if (result === undefined) {
				continue;
			}

			const { key, built, namesWithMetadata: namesWithMetadataPart } = result;

			const builtCommand = template as BuiltCommand;

			builtCommand.key = key;
			builtCommand.built = built;

			// @ts-ignore: This is fine for now.
			commands[identifier as CommandName] = builtCommand;
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
			commands: commands as BuiltCommands,
			showable,
			withRateLimit,
			executeHandlers,
			autocompleteHandlers,
		});
	}

	static build(_: {
		localisations: LocalisationStore;
		template: CommandTemplate;
		keyPrefix?: string;
	}): BuildResult<Command> | undefined;
	static build(_: { localisations: LocalisationStore; template: OptionTemplate; keyPrefix?: string }):
		| BuildResult<Option>
		| undefined;
	static build({
		localisations,
		template,
		keyPrefix,
	}: {
		localisations: LocalisationStore;
		template: CommandTemplate | OptionTemplate;
		keyPrefix?: string;
	}): BuildResult<Command | Option> | undefined {
		let key: string;
		if (keyPrefix !== undefined) {
			key = `${keyPrefix}.options.${template.identifier}`;
		} else {
			key = template.identifier;
		}

		const nameLocalisations = localisations.buildNameLocalisations({ key });
		if (nameLocalisations === undefined) {
			return undefined;
		}

		const descriptionLocalisations = localisations.buildDescriptionLocalisations({ key });
		if (descriptionLocalisations === undefined) {
			return undefined;
		}

		if (template.options === undefined || Object.keys(template.options).length === 0) {
			const localisedNamesWithMetadata: LocalisedNamesWithMetadata = [nameLocalisations, template];

			let built: Discord.CreateApplicationCommand | Discord.ApplicationCommandOption;
			if (keyPrefix !== undefined) {
				built = CommandStore.buildOption({
					template: template as OptionTemplate,
					nameLocalisations,
					descriptionLocalisations,
				});
			} else {
				built = CommandStore.buildCommand({
					template: template as CommandTemplate,
					nameLocalisations,
					descriptionLocalisations,
				});
			}

			return { key, built, namesWithMetadata: [localisedNamesWithMetadata] };
		}

		const namesWithMetadata: LocalisedNamesWithMetadata[] = [];
		const optionTemplates = Object.values(template.options) as OptionBuilder[];
		for (const template of optionTemplates) {
			const result = CommandStore.build({ localisations, template, keyPrefix: key });
			if (result === undefined) {
				continue;
			}

			const { key: builtKey, built, namesWithMetadata: namesWithMetadataPart } = result;

			template.key = builtKey;
			template.built = built;

			if (
				!(
					template.type === Discord.ApplicationCommandOptionTypes.SubCommand ||
					template.type === Discord.ApplicationCommandOptionTypes.SubCommandGroup
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
					const localisedName =
						optionNameLocalisations.nameLocalizations?.[locale] ?? optionNameLocalisations.name;
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

		let built: Discord.CreateApplicationCommand | Discord.ApplicationCommandOption;
		if (keyPrefix !== undefined) {
			built = CommandStore.buildOption({
				template: template as OptionTemplate,
				nameLocalisations,
				descriptionLocalisations,
				options: optionTemplates.map((option) => option.built),
			});
		} else {
			built = CommandStore.buildCommand({
				template: template as CommandTemplate,
				nameLocalisations,
				descriptionLocalisations,
				options: optionTemplates.map((option) => option.built),
			});
		}

		return { key, built, namesWithMetadata };
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
			minValue: template.minimumValue,
			maxValue: template.maximumValue,
			minLength: template.minimumLength,
			maxLength: template.maximumLength,
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
		const commands: CommandBuilder[] = [];

		if (guildDocument.hasEnabled("languageFeatures")) {
			if (guildDocument.hasEnabled("answers")) {
				commands.push(this.commands.answerMessage);
			}

			if (guildDocument.hasEnabled("corrections")) {
				commands.push(this.commands.correctionFullMessage, this.commands.correctionPartialMessage);
			}

			if (guildDocument.hasEnabled("cefr")) {
				commands.push(this.commands.cefr);
			}

			if (guildDocument.hasEnabled("game") && this.#client.volatile) {
				commands.push(this.commands.game);
			}

			if (guildDocument.hasEnabled("resources")) {
				commands.push(this.commands.resources);
			}

			if (guildDocument.hasEnabled("translate")) {
				commands.push(this.commands.translate, this.commands.translateMessage);
			}

			if (guildDocument.hasEnabled("word")) {
				commands.push(this.commands.word);
			}
		}

		if (guildDocument.hasEnabled("moderationFeatures")) {
			commands.push(this.commands.list);

			if (guildDocument.hasEnabled("policy")) {
				commands.push(this.commands.policy);
			}

			if (guildDocument.hasEnabled("rules")) {
				commands.push(this.commands.rule);
			}

			if (guildDocument.hasEnabled("slowmode")) {
				commands.push(this.commands.slowmode);
			}

			if (guildDocument.hasEnabled("timeouts")) {
				commands.push(this.commands.timeout);
			}

			if (guildDocument.hasEnabled("purging")) {
				commands.push(this.commands.purge);
			}

			if (guildDocument.hasEnabled("warns")) {
				commands.push(this.commands.warn, this.commands.pardon);
			}

			if (guildDocument.hasEnabled("reports")) {
				commands.push(this.commands.report);
			}
		}

		if (guildDocument.hasEnabled("serverFeatures")) {
			if (guildDocument.hasEnabled("suggestions")) {
				commands.push(this.commands.suggestion);
			}

			if (guildDocument.hasEnabled("tickets")) {
				commands.push(this.commands.ticket);
			}

			if (guildDocument.hasEnabled("resourceSubmissions")) {
				commands.push(this.commands.resource);
			}
		}

		if (guildDocument.hasEnabled("socialFeatures")) {
			if (guildDocument.hasEnabled("music") && this.#client.lavalinkService !== undefined) {
				commands.push(this.commands.music);
			}

			if (guildDocument.hasEnabled("praises")) {
				commands.push(this.commands.praise);
			}

			if (guildDocument.hasEnabled("profile")) {
				commands.push(this.commands.profile);
			}
		}

		return [...this.#defaultCommands.map((command) => command.built), ...commands.map((command) => command.built)];
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

		return lastUseTimestamps.filter((timestamp) => executedAt - timestamp <= intervalMilliseconds);
	}

	getRateLimit(interaction: Logos.Interaction, { executedAt }: { executedAt: number }): RateLimit | undefined {
		const commandId = interaction.data?.id;
		if (commandId === undefined) {
			return undefined;
		}

		const intervalMilliseconds = timeStructToMilliseconds(constants.defaults.COMMAND_RATE_LIMIT.within);

		const memberId = this.#client.bot.transformers.snowflake(`${interaction.user.id}${interaction.guildId}`);

		const timestamps = this.#getLastCommandUseTimestamps({
			memberId,
			commandId,
			executedAt,
			intervalMilliseconds,
		});

		if (timestamps.length + 1 > constants.defaults.COMMAND_RATE_LIMIT.uses) {
			const lastTimestamp = timestamps.at(0);
			if (lastTimestamp === undefined) {
				throw new Error("Unexpectedly undefined initial timestamp.");
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

export { CommandStore };
