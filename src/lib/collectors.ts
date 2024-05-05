import { isAutocomplete, isSubcommand, isSubcommandGroup } from "logos:constants/interactions";
import {
	LearningLanguage,
	getDiscordLocalisationLanguageByLocale,getLocaleByLearningLanguage,
	getLocaleByLocalisationLanguage, 
} from "logos:constants/languages";
import { Client } from "logos/client";
import { Guild } from "logos/database/guild";
import { User } from "logos/database/user";
import { nanoid } from "nanoid";

type CollectEvent<Event extends keyof Discord.EventHandlers = keyof Discord.EventHandlers> = (
	...args: Parameters<Discord.EventHandlers[Event]>
) => void | Promise<void>;
type DoneEvent = () => void | Promise<void>;
class Collector<Event extends keyof Discord.EventHandlers = any> {
	readonly done: Promise<void>;
	readonly guildId?: bigint;

	readonly #isSingle: boolean;
	readonly #removeAfter?: number;
	readonly #dependsOn?: Collector;

	readonly #_resolveDone: () => void;
	#_onCollect?: CollectEvent<Event>;
	#_onDone?: DoneEvent;
	#_isClosed = false;

	get close(): DoneEvent {
		return this.dispatchDone.bind(this);
	}

	constructor({
		guildId,
		isSingle,
		removeAfter,
		dependsOn,
	}: {
		guildId?: bigint;
		isSingle?: boolean;
		removeAfter?: number;
		dependsOn?: Collector;
	} = {}) {
		const done = Promise.withResolvers<void>();
		this.done = done.promise;
		this.#_resolveDone = done.resolve;

		this.guildId = guildId;

		this.#isSingle = isSingle ?? false;
		this.#removeAfter = removeAfter;
		this.#dependsOn = dependsOn;
	}

	initialise(): void {
		if (this.#removeAfter !== undefined) {
			setTimeout(() => this.close(), this.#removeAfter);
		}

		if (this.#dependsOn !== undefined) {
			this.#dependsOn.done.then(() => this.close());
		}
	}

	filter(..._: Parameters<Discord.EventHandlers[Event]>): boolean {
		return true;
	}

	async dispatchCollect(...args: Parameters<Discord.EventHandlers[Event]>): Promise<void> {
		if (this.#_isClosed) {
			return;
		}

		await this.#_onCollect?.(...args);

		if (this.#isSingle) {
			this.close();
			return;
		}
	}

	async dispatchDone(): Promise<void> {
		if (this.#_isClosed) {
			return;
		}

		const dispatchDone = this.#_onDone;

		this.#_isClosed = true;
		this.#_onCollect = undefined;
		this.#_onDone = undefined;

		await dispatchDone?.();
		this.#_resolveDone();
	}

	onCollect(callback: CollectEvent<Event>): void {
		this.#_onCollect = callback;
	}

	onDone(callback: DoneEvent): void {
		if (this.#_onDone !== undefined) {
			return;
		}

		this.#_onDone = callback;
	}
}

class InteractionCollector<
	Metadata extends string[] = [],
	Parameters extends Record<string, string | number | boolean | undefined> = Record<string, string>,
> extends Collector<"interactionCreate"> {
	static readonly noneId = constants.components.none;

	static readonly #_defaultParameters: Logos.InteractionParameters<Record<string, unknown>> = Object.freeze({
		"@repeat": false,
		show: false,
	});

	readonly anyType: boolean;
	readonly type: Discord.InteractionTypes;
	readonly anyCustomId: boolean;
	readonly customId: string;
	readonly only: Set<bigint>;

	readonly #client: Client;

	readonly #_baseId: string;
	readonly #_acceptAnyUser: boolean;

	constructor(
		client: Client,
		{
			guildId,
			anyType,
			type,
			anyCustomId,
			customId,
			only,
			dependsOn,
			isSingle,
			isPermanent,
		}: {
			guildId?: bigint;
			anyType?: boolean;
			type?: Discord.InteractionTypes;
			anyCustomId?: boolean;
			customId?: string;
			only?: bigint[];
			dependsOn?: Collector;
			isSingle?: boolean;
			isPermanent?: boolean;
		},
	) {
		super({
			guildId,
			isSingle,
			removeAfter: !isPermanent ? constants.INTERACTION_TOKEN_EXPIRY : undefined,
			dependsOn,
		});

		this.anyType = anyType ?? false;
		this.type = type ?? Discord.InteractionTypes.MessageComponent;
		this.anyCustomId = anyCustomId ?? false;
		this.customId = customId ?? nanoid();
		this.only = only !== undefined ? new Set(only) : new Set();

		this.#client = client;

		this.#_baseId = InteractionCollector.decodeId(this.customId)[0];
		this.#_acceptAnyUser = this.only.values.length === 0;
	}

	static getCommandName(interaction: Discord.Interaction): string {
		const commandName = interaction.data?.name;
		if (commandName === undefined) {
			throw "Command did not have a name.";
		}

		const subCommandGroupOption = interaction.data?.options?.find((option) => isSubcommandGroup(option));

		let commandNameFull: string;
		if (subCommandGroupOption !== undefined) {
			const subCommandGroupName = subCommandGroupOption.name;
			const subCommandName = subCommandGroupOption.options?.find((option) => isSubcommand(option))?.name;
			if (subCommandName === undefined) {
				throw "Sub-command did not have a name.";
			}

			commandNameFull = `${commandName} ${subCommandGroupName} ${subCommandName}`;
		} else {
			const subCommandName = interaction.data?.options?.find((option) => isSubcommand(option))?.name;
			if (subCommandName === undefined) {
				commandNameFull = commandName;
			} else {
				commandNameFull = `${commandName} ${subCommandName}`;
			}
		}

		return commandNameFull;
	}

	static encodeCustomId<Parts extends string[] = string[]>(parts: Parts): string {
		return parts.join(constants.special.interaction.divider);
	}

	filter(interaction: Discord.Interaction): boolean {
		if (!this.anyType) {
			if (interaction.type !== this.type) {
				return false;
			}
		}

		if (!this.only.has(interaction.user.id) && !this.#_acceptAnyUser) {
			return false;
		}

		if (interaction.data === undefined) {
			return false;
		}

		if (!this.anyCustomId) {
			if (interaction.data.customId === undefined) {
				return false;
			}

			const data = InteractionCollector.decodeId(interaction.data.customId);
			if (data[0] !== this.#_baseId) {
				return false;
			}
		}

		return true;
	}

	/**
	 * @deprecated
	 * Do not use as this receives raw Discord interaction events, rather than Logos ones.
	 * Use {@link InteractionCollector.onInteraction()} instead.
	 */
	onCollect(_: CollectEvent<"interactionCreate">) {
		throw "UnimplementedError: Do not use `onCollect()` on interaction controllers. Use `onInteraction()` instead.";
	}

	onInteraction(callback: (interaction: Logos.Interaction<Metadata, Parameters>) => Promise<void>): void {
		super.onCollect(async (interactionRaw) => {
			const locales = await this.#getLocaleData(interactionRaw);
			const metadata = this.#getMetadata(interactionRaw);
			const parameters = this.#getParameters<Parameters>(interactionRaw);

			let name: string;
			if (
				interactionRaw.type === Discord.InteractionTypes.ApplicationCommand ||
				interactionRaw.type === Discord.InteractionTypes.ApplicationCommandAutocomplete
			) {
				name = InteractionCollector.getCommandName(interactionRaw);
			} else {
				name = constants.components.none;
			}

			const interaction: Logos.Interaction<Metadata, Parameters> = {
				...(interactionRaw as unknown as Logos.Interaction),
				...locales,
				commandName: name,
				metadata,
				parameters,
			};

			await callback(interaction);
		});
	}

	async #getLocaleData(interaction: Discord.Interaction): Promise<Logos.InteractionLocaleData> {
		const member = this.#client.entities.members.get(interaction.guildId!)?.get(interaction.user.id);
		if (member === undefined) {
			return {
				locale: constants.defaults.LOCALISATION_LOCALE,
				language: constants.defaults.LOCALISATION_LANGUAGE,
				guildLocale: constants.defaults.LOCALISATION_LOCALE,
				guildLanguage: constants.defaults.LOCALISATION_LANGUAGE,
				learningLocale: constants.defaults.LEARNING_LOCALE,
				learningLanguage: constants.defaults.LEARNING_LANGUAGE,
				featureLanguage: constants.defaults.FEATURE_LANGUAGE,
			};
		}

		const [userDocument, guildDocument] = await Promise.all([
			User.getOrCreate(this.#client, { userId: interaction.user.id.toString() }),
			Guild.getOrCreate(this.#client, { guildId: interaction.guildId!.toString() }),
		]);

		const targetLanguage = guildDocument.targetLanguage;
		const learningLanguage = this.#determineLearningLanguage(guildDocument, member) ?? targetLanguage;
		const learningLocale = getLocaleByLearningLanguage(learningLanguage);

		const guildLanguage = guildDocument.isTargetLanguageOnly(interaction.channelId!.toString())
			? targetLanguage
			: guildDocument.localisationLanguage;
		const guildLocale = getLocaleByLocalisationLanguage(guildLanguage);
		const featureLanguage = guildDocument.featureLanguage;

		if (!isAutocomplete(interaction)) {
			// If the user has configured a custom locale, use the user's preferred locale.
			if (userDocument.preferredLanguage !== undefined) {
				const language = userDocument.preferredLanguage;
				const locale = getLocaleByLocalisationLanguage(language);
				return { locale, language, guildLocale, guildLanguage, learningLocale, learningLanguage, featureLanguage };
			}
		}

		// Otherwise default to the user's app language.
		const appLocale = interaction.locale;
		const language = getDiscordLocalisationLanguageByLocale(appLocale) ?? constants.defaults.LOCALISATION_LANGUAGE;
		const locale = getLocaleByLocalisationLanguage(language);
		return { locale, language, guildLocale, guildLanguage, learningLocale, learningLanguage, featureLanguage };
	}

	#getMetadata(interaction: Discord.Interaction): Logos.Interaction<Metadata>["metadata"] {
		const idEncoded = interaction.data?.customId;
		if (idEncoded === undefined) {
			return [constants.components.none] as unknown as Logos.Interaction<Metadata>["metadata"];
		}

		return InteractionCollector.decodeId(idEncoded);
	}

	#getParameters<Parameters extends Record<string, string | number | boolean | undefined>>(
		interaction: Discord.Interaction,
	): Logos.InteractionParameters<Parameters> {
		const options = interaction.data?.options;
		if (options === undefined) {
			return InteractionCollector.#_defaultParameters as Logos.InteractionParameters<Parameters>;
		}

		return Object.assign(
			InteractionCollector.#parseParameters(options),
			InteractionCollector.#_defaultParameters,
		) as Logos.InteractionParameters<Parameters>;
	}

	static #parseParameters<Parameters extends Record<string, string | number | boolean | undefined>>(
		options: Discord.InteractionDataOption[],
	): Partial<Parameters> {
		const result: Partial<Record<string, string | number | boolean | undefined>> = {};

		for (const option of options) {
			if (option.focused) {
				result.focused = option.name;
			}

			if (option.options !== undefined) {
				const parameters = InteractionCollector.#parseParameters(option.options);
				for (const [key, value] of Object.entries(parameters)) {
					result[key] = value;
				}

				continue;
			}

			result[option.name] = option.value;
		}

		return result as unknown as Partial<Parameters>;
	}

	#determineLearningLanguage(guildDocument: Guild, member: Logos.Member): LearningLanguage | undefined {
		if (member === undefined) {
			return undefined;
		}

		const roleLanguages = guildDocument.roleLanguages;
		if (roleLanguages === undefined) {
			return undefined;
		}

		const userLearningLanguage = Object.entries(roleLanguages.ids).find(([key, _]) =>
			member.roles.includes(BigInt(key)),
		)?.[1];
		if (userLearningLanguage === undefined) {
			return undefined;
		}

		return userLearningLanguage;
	}

	encodeId<Metadata extends string[] = []>(metadata: Metadata): string {
		return [this.customId, ...metadata].join(constants.special.interaction.separator);
	}

	static decodeId<Metadata extends string[] = []>(idEncoded: string): [customId: string, ...metadata: Metadata] {
		return idEncoded.split(constants.special.interaction.separator) as [customId: string, ...metadata: Metadata];
	}
}

export { Collector, InteractionCollector };
