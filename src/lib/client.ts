import { randomUUID } from "node:crypto";
import * as Discord from "@discordeno/bot";
import { Redis } from "ioredis";
import log from "loglevel";
import { nanoid } from "nanoid";
import * as ravendb from "ravendb";
import constants from "../constants/constants";
import languages, {
	LearningLanguage,
	Locale,
	LocalisationLanguage,
	getDiscordLocaleByLocalisationLanguage,
	getDiscordLocalisationLanguageByLocale,
	getLocaleByLocalisationLanguage,
	getLocalisationLanguageByLocale,
	isDiscordLocalisationLanguage,
} from "../constants/languages";
import { getDiscordLanguageByLocale } from "../constants/languages/localisation";
import time from "../constants/time";
import defaults from "../defaults";
import { capitalise, timestamp, trim } from "../formatting";
import * as Logos from "../types";
import {
	Command,
	CommandMetadata,
	CommandTemplate,
	InteractionHandler,
	Option,
	OptionTemplate,
} from "./commands/command";
import commandTemplates from "./commands/commands";
import { EntryRequest } from "./database/entry-request";
import { Guild, timeStructToMilliseconds } from "./database/guild";
import { GuildStats } from "./database/guild-stats";
import { Collection, Model, RawDocument } from "./database/model";
import { Praise } from "./database/praise";
import { Report } from "./database/report";
import { Resource } from "./database/resource";
import { Suggestion } from "./database/suggestion";
import { Ticket } from "./database/ticket";
import { User } from "./database/user";
import { Warning } from "./database/warning";
import diagnostics from "./diagnostics";
import transformers from "./localisation/transformers";
import { AlertService } from "./services/alert/alert";
import { DynamicVoiceChannelService } from "./services/dynamic-voice-channels/dynamic-voice-channels";
import { EntryService } from "./services/entry/entry";
import { InteractionRepetitionService } from "./services/interaction-repetition/interaction-repetition";
import { JournallingService } from "./services/journalling/journalling";
import { LavalinkService } from "./services/music/lavalink";
import { MusicService } from "./services/music/music";
import { NoticeService } from "./services/notices/service";
import { InformationNoticeService } from "./services/notices/types/information";
import { ResourceNoticeService } from "./services/notices/types/resources";
import { RoleNoticeService } from "./services/notices/types/roles";
import { WelcomeNoticeService } from "./services/notices/types/welcome";
import { PromptService } from "./services/prompts/service";
import { ReportService } from "./services/prompts/types/reports";
import { ResourceService } from "./services/prompts/types/resources";
import { SuggestionService } from "./services/prompts/types/suggestions";
import { TicketService } from "./services/prompts/types/tickets";
import { VerificationService } from "./services/prompts/types/verification";
import { RealtimeUpdateService } from "./services/realtime-updates/service";
import { RoleIndicatorService } from "./services/role-indicators/role-indicators";
import { Service } from "./services/service";
import { StatusService } from "./services/status/service";
import { compact } from "./utils";

interface Environment {
	readonly isDebug: boolean;
	readonly discordSecret: string;
	readonly deeplSecret: string;
	readonly rapidApiSecret: string;
	readonly ravendbHost: string;
	readonly ravendbDatabase: string;
	readonly ravendbSecure: boolean;
	readonly lavalinkHost: string;
	readonly lavalinkPort: string;
	readonly lavalinkPassword: string;
}

class Logger {
	static readonly #_instances = new Map<string, Logger>();

	readonly #identifierDisplayed: string;
	readonly #isDebug: boolean;

	private constructor({ identifier, isDebug = false }: { identifier: string; isDebug?: boolean }) {
		this.#identifierDisplayed = `[${identifier}]`;
		this.#isDebug = isDebug;
	}

	static create({ identifier, isDebug = false }: { identifier: string; isDebug?: boolean }): Logger {
		if (Logger.#_instances.has(identifier)) {
			return Logger.#_instances.get(identifier)!;
		}

		return new Logger({ identifier, isDebug });
	}

	debug(...args: unknown[]) {
		this.#isDebug && log.info(this.#identifierDisplayed, ...args);
	}

	info(...args: unknown[]) {
		log.info(this.#identifierDisplayed, ...args);
	}

	error(...args: unknown[]) {
		log.error(this.#identifierDisplayed, ...args);
	}

	warn(...args: unknown[]) {
		log.warn(this.#identifierDisplayed, ...args);
	}
}

class DocumentSession extends ravendb.DocumentSession {
	static readonly #_classes: Record<Collection, { new (data: any): Model }> = {
		EntryRequests: EntryRequest,
		GuildStats: GuildStats,
		Guilds: Guild,
		Praises: Praise,
		Reports: Report,
		Resources: Resource,
		Suggestions: Suggestion,
		Tickets: Ticket,
		Users: User,
		Warnings: Warning,
	};

	readonly #database: Database;

	constructor({ database, id, options }: { database: Database; id: string; options: ravendb.SessionOptions }) {
		super(database, id, options);

		this.#database = database;
	}

	static instantiateModel<M extends Model>(payload: RawDocument): M {
		if (payload["@metadata"]["@collection"] === "@empty") {
			throw `Document ${payload["@metadata"]["@collection"]} is not part of any collection.`;
		}

		if (!(payload["@metadata"]["@collection"] in DocumentSession.#_classes)) {
			throw `Document ${payload.id} is part of unknown collection: "${payload["@metadata"]["@collection"]}"`;
		}

		const Class = DocumentSession.#_classes[payload["@metadata"]["@collection"] as Collection];

		return new Class(payload) as M;
	}

	async get<M extends Model>(id: string): Promise<M | undefined>;
	async get<M extends Model>(ids: string[]): Promise<(M | undefined)[]>;
	async get<M extends Model>(idOrIds: string | string[]): Promise<M | undefined | (M | undefined)[]> {
		const result = (await this.load(Array.isArray(idOrIds) ? idOrIds : [idOrIds])) as Record<
			string,
			RawDocument | null
		>;
		if (result === null) {
			return undefined;
		}

		const documentsRaw = Object.values(result).map((documentRaw) => documentRaw ?? undefined);

		const documents: (M | undefined)[] = [];
		for (const documentRaw of documentsRaw) {
			if ((documentRaw ?? undefined) === undefined) {
				documents.push(undefined);
				continue;
			}

			const document = DocumentSession.instantiateModel(documentRaw!) as M;
			documents.push(document);
		}

		if (Array.isArray(idOrIds)) {
			return documents;
		}

		return documents.at(0)!;
	}

	async set<M extends Model>(document: M): Promise<void> {
		await this.store<M>(document, document["@metadata"]["@id"]);

		this.#database.cacheDocument(document);
	}

	async remove<M extends Model>(document: M): Promise<void> {
		// We don't call `delete()` here because we don't actually delete from the database.

		this.#database.unloadDocument(document);
	}
}

class Database extends ravendb.DocumentStore {
	readonly cache: {
		readonly entryRequests: Map<string, EntryRequest>;
		readonly guildStats: Map<string, GuildStats>;
		readonly guilds: Map<string, Guild>;
		readonly praisesByAuthor: Map<string, Map<string, Praise>>;
		readonly praisesByTarget: Map<string, Map<string, Praise>>;
		readonly reports: Map<string, Report>;
		readonly resources: Map<string, Resource>;
		readonly suggestions: Map<string, Suggestion>;
		readonly tickets: Map<string, Ticket>;
		readonly users: Map<string, User>;
		readonly warningsByTarget: Map<string, Map<string, Warning>>;
	};

	readonly #log: Logger;

	private constructor({
		host,
		database,
		certificate,
		isDebug,
	}: { host: string; database: string; certificate?: Buffer; isDebug?: boolean }) {
		if (certificate !== undefined) {
			super(host, database, { certificate, type: "pfx" });
		} else {
			super(host, database);
		}

		this.cache = {
			entryRequests: new Map(),
			guildStats: new Map(),
			guilds: new Map(),
			praisesByAuthor: new Map(),
			praisesByTarget: new Map(),
			reports: new Map(),
			resources: new Map(),
			suggestions: new Map(),
			tickets: new Map(),
			users: new Map(),
			warningsByTarget: new Map(),
		};

		this.#log = Logger.create({ identifier: "Client/Database", isDebug });
	}

	static async create(options: { host: string; database: string; certificate?: Buffer }): Promise<Database> {
		const database = new Database(options);

		database.initialize();

		await database.#prefetchDocuments();

		return database;
	}

	async #prefetchDocuments(): Promise<void> {
		this.#log.info("Prefetching documents...");

		const result = await Promise.all([
			EntryRequest.getAll(this),
			Report.getAll(this),
			Resource.getAll(this),
			Suggestion.getAll(this),
			Ticket.getAll(this),
		]);
		const documents = result.flat();

		this.cacheDocuments(documents);
	}

	cacheDocuments<M extends Model>(documents: M[]): void {
		this.#log.info(`Caching ${documents.length} documents...`);

		for (const document of documents) {
			this.cacheDocument(document);
		}
	}

	cacheDocument<M extends Model>(document: M): void {
		switch (true) {
			case document instanceof EntryRequest: {
				this.cache.entryRequests.set(document.partialId, document);
				break;
			}
			case document instanceof GuildStats: {
				this.cache.guildStats.set(document.partialId, document);
				break;
			}
			case document instanceof Guild: {
				this.cache.guilds.set(document.partialId, document);
				break;
			}
			case document instanceof Praise: {
				if (this.cache.praisesByAuthor.has(document.authorId)) {
					this.cache.praisesByAuthor.get(document.authorId)?.set(document.partialId, document);
				} else {
					this.cache.praisesByAuthor.set(document.authorId, new Map([[document.partialId, document]]));
				}

				if (this.cache.praisesByTarget.has(document.targetId)) {
					this.cache.praisesByTarget.get(document.targetId)?.set(document.partialId, document);
				} else {
					this.cache.praisesByTarget.set(document.targetId, new Map([[document.partialId, document]]));
				}

				break;
			}
			case document instanceof Report: {
				this.cache.reports.set(document.partialId, document);
				break;
			}
			case document instanceof Resource: {
				this.cache.resources.set(document.partialId, document);
				break;
			}
			case document instanceof Suggestion: {
				this.cache.suggestions.set(document.partialId, document);
				break;
			}
			case document instanceof Ticket: {
				this.cache.tickets.set(document.partialId, document);
				break;
			}
			case document instanceof User: {
				this.cache.users.set(document.partialId, document);
				break;
			}
			case document instanceof Warning: {
				if (this.cache.warningsByTarget.has(document.targetId)) {
					this.cache.warningsByTarget.get(document.targetId)?.set(document.partialId, document);
				} else {
					this.cache.warningsByTarget.set(document.targetId, new Map([[document.partialId, document]]));
				}
				break;
			}
		}
	}

	unloadDocument<M extends Model>(document: M): void {
		switch (true) {
			case document instanceof EntryRequest: {
				this.cache.entryRequests.delete(document.partialId);
				break;
			}
			case document instanceof GuildStats: {
				this.cache.guildStats.delete(document.partialId);
				break;
			}
			case document instanceof Guild: {
				this.cache.guilds.delete(document.partialId);
				break;
			}
			case document instanceof Praise: {
				if (this.cache.praisesByAuthor.has(document.authorId)) {
					this.cache.praisesByAuthor.get(document.authorId)?.delete(document.partialId);
				}

				if (this.cache.praisesByTarget.has(document.targetId)) {
					this.cache.praisesByTarget.get(document.targetId)?.delete(document.partialId);
				}

				break;
			}
			case document instanceof Report: {
				this.cache.reports.delete(document.partialId);
				break;
			}
			case document instanceof Resource: {
				this.cache.resources.delete(document.partialId);
				break;
			}
			case document instanceof Suggestion: {
				this.cache.suggestions.delete(document.partialId);
				break;
			}
			case document instanceof Ticket: {
				this.cache.tickets.delete(document.partialId);
				break;
			}
			case document instanceof User: {
				this.cache.users.delete(document.partialId);
				break;
			}
			case document instanceof Warning: {
				if (this.cache.warningsByTarget.has(document.targetId)) {
					this.cache.warningsByTarget.get(document.targetId)?.delete(document.partialId);
				}
				break;
			}
		}
	}

	/**
	 * @deprecated
	 *
	 * Use {@link Database.withSession()} instead.
	 *
	 * @remarks
	 *
	 * This method was reconstructed from the original implementation of the RavenDB `DocumentStore.openSession()`.
	 */
	openSession(): DocumentSession {
		this.assertInitialized();
		this._ensureNotDisposed();

		const session = new DocumentSession({ database: this, id: randomUUID(), options: { noCaching: false } });
		this.registerEvents(session);
		this.emit("sessionCreated", { session });

		return session;
	}

	async withSession(callback: (session: DocumentSession) => Promise<void>): Promise<void> {
		const session = this.openSession();

		await callback(session);

		session.dispose();
	}
}

class Cache {
	readonly database: Redis;

	constructor() {
		this.database = new Redis();
	}
}

class DiscordConnection {
	readonly bot: Discord.Bot;
	readonly cache: {
		readonly guilds: Map<bigint, Logos.Guild>;
		readonly users: Map<bigint, Logos.User>;
		readonly members: Map<bigint, Logos.Member>;
		readonly channels: Map<bigint, Logos.Channel>;
		readonly messages: {
			readonly latest: Map<bigint, Logos.Message>;
			readonly previous: Map<bigint, Logos.Message>;
		};
	};

	readonly #log: Logger;

	constructor({
		bot,
		events,
		isDebug,
	}: { bot: Discord.Bot; events: Partial<Discord.EventHandlers>; isDebug?: boolean }) {
		this.bot = bot;
		this.cache = {
			guilds: new Map(),
			users: new Map(),
			members: new Map(),
			channels: new Map(),
			messages: {
				latest: new Map(),
				previous: new Map(),
			},
		};

		this.#log = Logger.create({ identifier: "Client/DiscordConnection", isDebug });

		// TODO(vxern): This is a fix for the Discordeno MESSAGE_UPDATE handler filtering out cases where an embed was removed from a message.
		this.bot.handlers.MESSAGE_UPDATE = (bot, data) => {
			const payload = data.d as Discord.DiscordMessage;
			if (!payload.author) return;

			bot.events.messageUpdate?.(bot.transformers.message(bot, payload));
		};
		this.bot.events = events;
		this.bot.transformers = this.#buildTransformers();
	}

	#buildTransformers(): Discord.Transformers {
		const transformers = Discord.createTransformers({
			guild: this.#transformGuild.bind(this),
			channel: this.#transformChannel.bind(this),
			user: this.#transformUser.bind(this),
			member: this.#transformMember.bind(this),
			message: this.#transformMessage.bind(this),
			role: this.#transformRole.bind(this),
			voiceState: this.#transformVoiceState.bind(this),
		});

		// TODO(vxern): Move this to `createBot()` once it's supported.
		transformers.desiredProperties = Logos.desiredProperties as Discord.Transformers["desiredProperties"];

		return transformers;
	}

	#transformGuild(_: Discord.Bot, payload: Parameters<Discord.Transformers["guild"]>[1]): Discord.Guild {
		const result = Discord.transformGuild(this.bot, payload);

		for (const channel of payload.guild.channels ?? []) {
			this.bot.transformers.channel(this.bot, { channel, guildId: result.id });
		}

		this.cache.guilds.set(result.id, result as unknown as Logos.Guild);

		return result;
	}

	#transformChannel(_: Discord.Bot, payload: Parameters<Discord.Transformers["channel"]>[1]): Discord.Channel {
		const result = Discord.transformChannel(this.bot, payload);

		this.cache.channels.set(result.id, result);

		if (result.guildId !== undefined) {
			this.cache.guilds.get(result.guildId)?.channels.set(result.id, result);
		}

		return result;
	}

	#transformUser(_: Discord.Bot, payload: Parameters<Discord.Transformers["user"]>[1]): Discord.User {
		const result = Discord.transformUser(this.bot, payload);

		this.cache.users.set(result.id, result);

		return result;
	}

	#transformMember(
		_: Discord.Bot,
		payload: Parameters<Discord.Transformers["member"]>[1],
		guildId: Discord.BigString,
		userId: Discord.BigString,
	): Discord.Member {
		const result = Discord.transformMember(this.bot, payload, guildId, userId);

		const memberSnowflake = this.bot.transformers.snowflake(`${userId}${guildId}`);

		this.cache.members.set(memberSnowflake, result);

		this.cache.guilds.get(BigInt(guildId))?.members.set(BigInt(userId), result);

		return result;
	}

	#transformMessage(_: Discord.Bot, payload: Parameters<Discord.Transformers["message"]>[1]): Discord.Message {
		const result = Discord.transformMessage(this.bot, payload);

		const previousMessage = this.cache.messages.latest.get(result.id);
		if (previousMessage !== undefined) {
			this.cache.messages.previous.set(result.id, previousMessage);
		}

		this.cache.messages.latest.set(result.id, result);

		const user = this.bot.transformers.user(this.bot, payload.author);

		this.cache.users.set(user.id, user);

		if (payload.member !== undefined && payload.guild_id !== undefined) {
			const guildId = this.bot.transformers.snowflake(payload.guild_id);

			const member = this.bot.transformers.member(
				this.bot,
				{ ...payload.member, user: payload.author },
				guildId,
				user.id,
			);

			const memberSnowflake = this.bot.transformers.snowflake(`${member.id}${member.guildId}`);

			this.cache.members.set(memberSnowflake, member);
		}

		return result;
	}

	#transformRole(_: Discord.Bot, payload: Parameters<Discord.Transformers["role"]>[1]): Discord.Role {
		const result = Discord.transformRole(this.bot, payload);

		this.cache.guilds.get(result.guildId)?.roles.set(result.id, result);

		return result;
	}

	#transformVoiceState(_: Discord.Bot, payload: Parameters<Discord.Transformers["voiceState"]>[1]): Discord.VoiceState {
		const result = Discord.transformVoiceState(this.bot, payload);

		if (result.channelId !== undefined) {
			this.cache.guilds.get(result.guildId)?.voiceStates.set(result.userId, result);
		} else {
			this.cache.guilds.get(result.guildId)?.voiceStates.delete(result.userId);
		}

		return result;
	}

	async open(): Promise<void> {
		this.#log.info("Opening connection to Discord...");

		await this.bot.start();
	}

	async close(): Promise<void> {
		this.#log.info("Closing connection to Discord...");

		await this.bot.shutdown();
	}
}

type LocalisationBuilder = (data?: Record<string, unknown>) => string;
type RawLocalisations = Map<string, Map<LocalisationLanguage, string>>;
type Localisations = Map<
	// String key.
	string,
	Map<
		// Language the string is localised into.
		LocalisationLanguage,
		// Generator function for dynamically slotting data into the string.
		LocalisationBuilder
	>
>;
interface NameLocalisations {
	readonly name: string;
	readonly nameLocalizations?: Partial<Record<Discord.Locales, string>>;
}
interface DescriptionLocalisations {
	readonly description: string;
	readonly descriptionLocalizations?: Partial<Record<Discord.Locales, string>>;
}
class LocalisationStore {
	readonly #log: Logger;
	readonly #localisations: Localisations;

	constructor({ localisations, isDebug }: { localisations: RawLocalisations; isDebug?: boolean }) {
		this.#localisations = LocalisationStore.#buildLocalisations(localisations);
		this.#log = Logger.create({ identifier: "Client/LocalisationStore", isDebug });
	}

	static #buildLocalisations(localisations: Map<string, Map<LocalisationLanguage, string>>): Localisations {
		const builders = new Map<string, Map<LocalisationLanguage, LocalisationBuilder>>();
		for (const [key, languages] of localisations.entries()) {
			const processors = new Map<LocalisationLanguage, LocalisationBuilder>();
			for (const [language, string] of languages.entries()) {
				processors.set(language, (data?: Record<string, unknown>) =>
					LocalisationStore.#processString(string, { data }),
				);
			}

			builders.set(key, processors);
		}

		return builders;
	}

	static #processString(string: string, { data }: { data?: Record<string, unknown> }) {
		if (data === undefined) {
			return string;
		}

		let result = string;
		for (const [key, value] of Object.entries(data)) {
			result = result.replaceAll(`{${key}}`, `${value}`);
		}
		return result;
	}

	getOptionName({ key }: { key: string }): string | undefined {
		const optionName = key.split(".")?.at(-1);
		if (optionName === undefined) {
			this.#log.warn(`Failed to get option name from localisation key '${key}'.`);
			return undefined;
		}

		return optionName;
	}

	getNameLocalisations({ key }: { key: string }): NameLocalisations | undefined {
		const optionName = this.getOptionName({ key });
		if (optionName === undefined) {
			return undefined;
		}

		let localisation: Map<LocalisationLanguage, LocalisationBuilder> | undefined;
		if (this.#localisations.has(`${key}.name`)) {
			localisation = this.#localisations.get(`${key}.name`)!;
		} else if (this.#localisations.has(`parameters.${optionName}.name`)) {
			localisation = this.#localisations.get(`parameters.${optionName}.name`)!;
		}

		const name = localisation?.get(defaults.LOCALISATION_LANGUAGE)?.();
		if (name === undefined) {
			this.#log.warn(`Could not get command name from string with key '${key}'.`);
			return undefined;
		}

		if (localisation === undefined) {
			return { name };
		}

		const nameLocalisations = LocalisationStore.#toDiscordLocalisations(localisation);
		for (const locale of languages.locales.discord) {
			if (locale in nameLocalisations) {
				continue;
			}

			nameLocalisations[locale] = name;
		}

		return { name, nameLocalizations: nameLocalisations };
	}

	getDescriptionLocalisations({ key }: { key: string }): DescriptionLocalisations | undefined {
		const optionName = this.getOptionName({ key });
		if (optionName === undefined) {
			return undefined;
		}

		let stringLocalisations: Map<LocalisationLanguage, LocalisationBuilder> | undefined;
		if (this.#localisations.has(`${key}.description`)) {
			stringLocalisations = this.#localisations.get(`${key}.description`)!;
		} else if (this.#localisations.has(`parameters.${optionName}.description`)) {
			stringLocalisations = this.#localisations.get(`parameters.${optionName}.description`)!;
		}

		const description = stringLocalisations?.get(defaults.LOCALISATION_LANGUAGE)?.({});
		if (description === undefined) {
			this.#log.warn(`Could not get command description from string with key '${key}'.`);
			return undefined;
		}

		if (stringLocalisations === undefined) {
			return { description };
		}

		const descriptionLocalisations = LocalisationStore.#toDiscordLocalisations(stringLocalisations);

		return { description, descriptionLocalizations: descriptionLocalisations };
	}

	static #toDiscordLocalisations(
		localisations: Map<LocalisationLanguage, (args: Record<string, unknown>) => string>,
	): Discord.Localization {
		const result: Discord.Localization = {};
		for (const [language, localise] of localisations.entries()) {
			if (!isDiscordLocalisationLanguage(language)) {
				continue;
			}

			const locale = getDiscordLocaleByLocalisationLanguage(language);
			if (locale === undefined) {
				continue;
			}

			const string = localise({});
			if (string.length === 0) {
				continue;
			}

			result[locale] = string;
		}

		return result;
	}

	has(key: string): boolean {
		return this.#localisations.has(key);
	}

	localise(key: string, locale?: Locale): LocalisationBuilder {
		return (data) => {
			let language: LocalisationLanguage;
			if (locale !== undefined) {
				language = getLocalisationLanguageByLocale(locale);
			} else {
				language = defaults.LOCALISATION_LANGUAGE;
			}

			const localisation = this.#localisations.get(key)!;
			const buildLocalisation = localisation.get(language) ?? localisation.get(defaults.LOCALISATION_LANGUAGE);
			if (buildLocalisation === undefined) {
				this.#log.warn(`Attempted to localise string with unknown key '${key}'.`);
				return key;
			}

			const string = buildLocalisation(data);
			if (language !== defaults.LOCALISATION_LANGUAGE && string.trim().length === 0) {
				return this.localise(key)(data);
			}

			return string;
		};
	}

	pluralise(key: string, language: LocalisationLanguage, number: number): string {
		const locale = getLocaleByLocalisationLanguage(language);

		const pluralise = transformers[language].pluralise;
		const { one, two, many } = {
			one: this.localise(`${key}.one`, locale)?.({ one: number }),
			two: this.localise(`${key}.two`, locale)?.({ two: number }),
			many: this.localise(`${key}.many`, locale)?.({ many: number }),
		};

		const pluralised = pluralise(`${number}`, { one, two, many });
		if (pluralised === undefined) {
			this.#log.warn(`Could not pluralise string with key '${key}' in ${language}.`);
			return key;
		}

		return pluralised;
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

interface RateLimit {
	nextAllowedUsageTimestamp: number;
}
type CommandName = keyof typeof commandTemplates;
type LocalisedNamesWithMetadata = [names: NameLocalisations, metadata: CommandMetadata];
type BuildResult<Object extends Command | Option> = [object: Object, namesWithFlags: LocalisedNamesWithMetadata[]];
class CommandStore {
	readonly commands: Partial<Record<CommandName, Command>>;

	readonly #log: Logger;
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

	private constructor({
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
	}) {
		this.commands = commands;

		this.#log = log;
		this.#collection = { showable, withRateLimit };
		this.#lastCommandUseTimestamps = new Map();
		this.#handlers = { execute: executeHandlers, autocomplete: autocompleteHandlers };

		this.#_defaultCommands = compact([
			this.commands.information,
			this.commands.acknowledgements,
			this.commands.credits,
			this.commands.licence,
			this.commands.settings,
			this.commands.recognise,
			this.commands.recogniseMessage,
		]);
	}

	static create({
		localisations,
		templates,
		isDebug,
	}: { localisations: LocalisationStore; templates: CommandTemplate[]; isDebug?: boolean }): CommandStore {
		const log = Logger.create({ identifier: "Client/InteractionStore", isDebug });

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
		const commandMetadataByDisplayName = new Map<string, CommandMetadata>();
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

		return new CommandStore({
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

		const nameLocalisations = localisations.getNameLocalisations({ key });
		if (nameLocalisations === undefined) {
			return undefined;
		}

		const descriptionLocalisations = localisations.getDescriptionLocalisations({ key });
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
				dmPermission: template.dmPermission,
				nsfw: template.nsfw,
				options,
			};
		}

		return {
			...nameLocalisations,
			type: template.type,
			defaultMemberPermissions: template.defaultMemberPermissions,
			dmPermission: template.dmPermission,
			nsfw: template.nsfw,
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

		return [...this.#_defaultCommands, ...compact(commands)];
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

	getRateLimit(
		client: Client,
		interaction: Logos.Interaction,
		{ executedAt }: { executedAt: number },
	): RateLimit | undefined {
		const commandId = interaction.data?.id;
		if (commandId === undefined) {
			return undefined;
		}

		const intervalMilliseconds = timeStructToMilliseconds(defaults.COMMAND_RATE_LIMIT.within);

		const memberId = client.bot.transformers.snowflake(`${interaction.user.id}${interaction.guildId}`);

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

class InteractionStore {
	readonly log: Logger;

	readonly #bot: Discord.Bot;
	readonly #interactions: Map<bigint, Logos.Interaction>;

	constructor({ bot, isDebug }: { bot: Discord.Bot; isDebug: boolean }) {
		this.log = Logger.create({ identifier: "Interactions", isDebug });

		this.#bot = bot;
		this.#interactions = new Map();
	}

	static spoofInteraction<Interaction extends Logos.Interaction>(
		interaction: Interaction,
		{ using, parameters }: { using: Logos.Interaction; parameters?: Interaction["parameters"] },
	): Interaction {
		return {
			...interaction,
			parameters: { ...interaction.parameters, ...parameters },
			type: Discord.InteractionTypes.ApplicationCommand,
			token: using.token,
			id: using.id,
		};
	}

	registerInteraction(interaction: Logos.Interaction): void {
		this.#interactions.set(interaction.id, interaction);
	}

	unregisterInteraction(interactionId: bigint): Logos.Interaction | undefined {
		const interaction = this.#interactions.get(interactionId);
		if (interaction === undefined) {
			return undefined;
		}

		this.#interactions.delete(interactionId);

		return interaction;
	}

	async acknowledge(interaction: Logos.Interaction): Promise<void> {
		await this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.DeferredUpdateMessage,
			})
			.catch((reason) => this.log.warn("Failed to acknowledge interaction:", reason));
	}

	async postponeReply(interaction: Logos.Interaction, { visible = false } = {}): Promise<void> {
		await this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.DeferredChannelMessageWithSource,
				data: visible ? {} : { flags: Discord.MessageFlags.Ephemeral },
			})
			.catch((reason) => this.log.warn("Failed to postpone reply to interaction:", reason));
	}

	async reply(
		interaction: Logos.Interaction,
		data: Omit<Discord.InteractionCallbackData, "flags">,
		{ visible = false } = {},
	): Promise<void> {
		await this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.ChannelMessageWithSource,
				data: { ...data, flags: visible ? undefined : Discord.MessageFlags.Ephemeral },
			})
			.catch((reason) => this.log.warn("Failed to reply to interaction:", reason));
	}

	async editReply(interaction: Logos.Interaction, data: Omit<Discord.InteractionCallbackData, "flags">): Promise<void> {
		await this.#bot.rest
			.editOriginalInteractionResponse(interaction.token, data)
			.catch((reason) => this.log.warn("Failed to edit reply to interaction:", reason));
	}

	async deleteReply(interaction: Logos.Interaction): Promise<void> {
		await this.#bot.rest
			.deleteOriginalInteractionResponse(interaction.token)
			.catch((reason) => this.log.warn("Failed to delete reply to interaction:", reason));
	}

	async respond(interaction: Logos.Interaction, choices: Discord.ApplicationCommandOptionChoice[]): Promise<void> {
		return this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: { choices },
			})
			.catch((reason) => this.log.warn("Failed to respond to autocomplete interaction:", reason));
	}

	async displayModal(
		interaction: Logos.Interaction,
		data: Omit<Discord.InteractionCallbackData, "flags">,
	): Promise<void> {
		return this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.Modal,
				data,
			})
			.catch((reason) => this.log.warn("Failed to show modal:", reason));
	}
}

type CollectEvent<Event extends keyof Discord.EventHandlers = keyof Discord.EventHandlers> = (
	...args: Parameters<Discord.EventHandlers[Event]>
) => unknown;
type DoneEvent = () => unknown;
class Collector<Event extends keyof Discord.EventHandlers = any> {
	readonly done: Promise<void>;

	readonly #isSingle: boolean;
	readonly #removeAfter?: number;
	readonly #dependsOn?: Collector;

	#onCollect?: CollectEvent<Event>;
	#onDone?: DoneEvent;
	#isClosed = false;

	readonly #_resolveDone: () => void;

	get close(): DoneEvent {
		return this.dispatchDone.bind(this);
	}

	constructor({
		isSingle,
		removeAfter,
		dependsOn,
	}: {
		isSingle?: boolean;
		removeAfter?: number;
		dependsOn?: Collector;
	} = {}) {
		this.#isSingle = isSingle ?? false;
		this.#removeAfter = removeAfter;
		this.#dependsOn = dependsOn;

		const done = Promise.withResolvers<void>();
		this.done = done.promise;
		this.#_resolveDone = done.resolve;
	}

	initialise(): void {
		if (this.#removeAfter !== undefined) {
			setTimeout(() => this.close());
		}

		if (this.#dependsOn !== undefined) {
			this.#dependsOn.done.then(() => this.close());
		}
	}

	filter(..._: Parameters<Discord.EventHandlers[Event]>): boolean {
		return true;
	}

	dispatchCollect(...args: Parameters<Discord.EventHandlers[Event]>): void {
		if (this.#isClosed) {
			return;
		}

		this.#onCollect?.(...args);

		if (this.#isSingle) {
			this.close();
			return;
		}
	}

	dispatchDone(): void {
		if (this.#isClosed) {
			return;
		}

		const dispatchDone = this.#onDone;

		this.#isClosed = true;
		this.#onCollect = undefined;
		this.#onDone = undefined;

		dispatchDone?.();
		this.#_resolveDone();
	}

	onCollect(callback: CollectEvent<Event>): void {
		this.#onCollect = callback;
	}

	onDone(callback: DoneEvent): void {
		if (this.#onDone !== undefined) {
			return;
		}

		this.#onDone = callback;
	}
}

class InteractionCollector<
	Metadata extends string[] = [],
	Parameters extends Record<string, string | number | boolean | undefined> = Record<string, string>,
> extends Collector<"interactionCreate"> {
	static readonly noneId = constants.components.none;

	static readonly #_defaultParameters: Logos.InteractionParameters<Record<string, unknown>> = { show: false };

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
			anyType,
			type,
			anyCustomId,
			customId,
			only,
			dependsOn,
			isSingle,
			isPermanent,
		}: {
			anyType?: boolean;
			type?: Discord.InteractionTypes;
			anyCustomId?: boolean;
			customId?: string;
			only?: bigint[];
			dependsOn?: Collector;
			isSingle?: boolean;
			isPermanent?: boolean;
		} = {},
	) {
		super({ isSingle, removeAfter: !isPermanent ? constants.INTERACTION_TOKEN_EXPIRY : undefined, dependsOn });

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

	static encodeCustomId<Parts extends string[] = []>(parts: Parts): string {
		return parts.join(constants.symbols.interaction.divider);
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

	// @ts-ignore
	onCollect(callback: (interaction: Logos.Interaction<Metadata, Parameters>) => Promise<void>): void {
		super.onCollect(async (interactionRaw) => {
			const locales = await this.#getLocaleData(interactionRaw);
			const name = InteractionCollector.getCommandName(interactionRaw);
			const metadata = this.#getMetadata(interactionRaw);
			const parameters = this.#getParameters<Parameters>(interactionRaw);

			const interaction: Logos.Interaction<Metadata, Parameters> = {
				...interactionRaw,
				...locales,
				commandName: name,
				metadata,
				parameters,
			};

			callback(interaction);
		});
	}

	async #getLocaleData(interaction: Discord.Interaction): Promise<Logos.InteractionLocaleData> {
		const [guildId, channelId, member] = [
			interaction.guildId,
			interaction.channelId,
			this.#client.entities.members.get(Discord.snowflakeToBigint(`${interaction.user.id}${interaction.guildId}`)),
		];
		if (guildId === undefined || channelId === undefined || member === undefined) {
			return {
				language: defaults.LOCALISATION_LANGUAGE,
				locale: defaults.LOCALISATION_LOCALE,
				guildLanguage: defaults.LOCALISATION_LANGUAGE,
				guildLocale: defaults.LOCALISATION_LOCALE,
				learningLanguage: defaults.LEARNING_LANGUAGE,
				featureLanguage: defaults.FEATURE_LANGUAGE,
			};
		}

		const [userDocument, guildDocument] = await Promise.all([
			User.getOrCreate(this.#client, { userId: interaction.user.id.toString() }),
			Guild.getOrCreate(this.#client, { guildId: guildId.toString() }),
		]);

		const targetLanguage = guildDocument.targetLanguage;
		const learningLanguage = this.#determineLearningLanguage(guildDocument, member) ?? targetLanguage;

		const guildLanguage = guildDocument.isTargetLanguageOnly(channelId.toString())
			? targetLanguage
			: guildDocument.localisationLanguage;
		const guildLocale = getLocaleByLocalisationLanguage(guildLanguage);
		const featureLanguage = guildDocument.featureLanguage;

		if (!isAutocomplete(interaction)) {
			// If the user has configured a custom locale, use the user's preferred locale.
			if (userDocument.preferredLanguage !== undefined) {
				const language = userDocument.preferredLanguage;
				const locale = getLocaleByLocalisationLanguage(language);
				return { language, locale, learningLanguage, guildLanguage, guildLocale, featureLanguage };
			}
		}

		// Otherwise default to the user's app language.
		const appLocale = interaction.locale;
		const language = getDiscordLocalisationLanguageByLocale(appLocale) ?? defaults.LOCALISATION_LANGUAGE;
		const locale = getLocaleByLocalisationLanguage(language);
		return { language, locale, learningLanguage, guildLanguage, guildLocale, featureLanguage };
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
			return { show: false } as Logos.InteractionParameters<Parameters>;
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

		// TODO(vxern): Do something with the focused option.
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
		return [this.customId, ...metadata].join(constants.symbols.interaction.separator);
	}

	static decodeId<Metadata extends string[] = []>(idEncoded: string): [customId: string, ...metadata: Metadata] {
		return idEncoded.split(constants.symbols.interaction.separator) as [customId: string, ...metadata: Metadata];
	}
}

type Event = keyof Discord.EventHandlers;
class EventStore {
	readonly #log: Logger;
	readonly #services: ServiceStore;
	readonly #collectors: Map<Event, Set<Collector<Event>>>;

	constructor({ services, isDebug }: { services: ServiceStore; isDebug?: boolean }) {
		this.#log = Logger.create({ identifier: "Client/EventStore", isDebug });
		this.#services = services;
		this.#collectors = new Map();
	}

	buildEventHandlers(): Partial<Discord.EventHandlers> {
		const events = this;

		return {
			async ready(...args) {
				events.#services.dispatchToGlobal("ready", { args });
			},
			async interactionCreate(interactionRaw) {
				events.dispatchEvent(interactionRaw.guildId, "interactionCreate", { args: [interactionRaw] });
			},
			async guildMemberAdd(member, user) {
				events.dispatchEvent(member.guildId, "guildMemberAdd", { args: [member, user] });
			},
			async guildMemberRemove(user, guildId) {
				events.dispatchEvent(guildId, "guildMemberRemove", { args: [user, guildId] });
			},
			async guildMemberUpdate(member, user) {
				events.dispatchEvent(member.guildId, "guildMemberUpdate", { args: [member, user] });
			},
			async messageCreate(message) {
				events.dispatchEvent(message.guildId, "messageCreate", { args: [message] });
			},
			async messageDelete(payload, message) {
				events.dispatchEvent(payload.guildId, "messageDelete", { args: [payload, message] });
			},
			async messageDeleteBulk(payload) {
				events.dispatchEvent(payload.guildId, "messageDeleteBulk", { args: [payload] });
			},
			async messageUpdate(message, oldMessage) {
				events.dispatchEvent(message.guildId, "messageUpdate", { args: [message, oldMessage] });
			},
			async voiceServerUpdate(payload) {
				events.dispatchEvent(payload.guildId, "voiceServerUpdate", { args: [payload] });
			},
			async voiceStateUpdate(voiceState) {
				events.dispatchEvent(voiceState.guildId, "voiceStateUpdate", { args: [voiceState] });
			},
			async channelCreate(channel) {
				events.dispatchEvent(channel.guildId, "channelCreate", { args: [channel] });
			},
			async channelDelete(channel) {
				events.dispatchEvent(channel.guildId, "channelDelete", { args: [channel] });
			},
			async channelPinsUpdate(data) {
				events.dispatchEvent(data.guildId, "channelPinsUpdate", { args: [data] });
			},
			async channelUpdate(channel) {
				events.dispatchEvent(channel.guildId, "channelUpdate", { args: [channel] });
			},
			async guildEmojisUpdate(payload) {
				events.dispatchEvent(payload.guildId, "guildEmojisUpdate", { args: [payload] });
			},
			async guildBanAdd(user, guildId) {
				events.dispatchEvent(guildId, "guildBanAdd", { args: [user, guildId] });
			},
			async guildBanRemove(user, guildId) {
				events.dispatchEvent(guildId, "guildBanRemove", { args: [user, guildId] });
			},
			async guildCreate(guild) {
				events.dispatchEvent(guild.id, "guildCreate", { args: [guild] });
			},
			async guildDelete(id, shardId) {
				events.dispatchEvent(id, "guildDelete", { args: [id, shardId] });
			},
			async guildUpdate(guild) {
				events.dispatchEvent(guild.id, "guildUpdate", { args: [guild] });
			},
			async roleCreate(role) {
				events.dispatchEvent(role.guildId, "roleCreate", { args: [role] });
			},
			async roleDelete(role) {
				events.dispatchEvent(role.guildId, "roleDelete", { args: [role] });
			},
			async roleUpdate(role) {
				events.dispatchEvent(role.guildId, "roleUpdate", { args: [role] });
			},
		};
	}

	async dispatchEvent<Event extends keyof Discord.EventHandlers>(
		guildId: bigint | undefined,
		event: Event,
		{ args }: { args: Parameters<Discord.EventHandlers[Event]> },
	): Promise<void> {
		const collectors = this.#collectors.get(event);
		if (collectors !== undefined) {
			for (const collector of collectors) {
				if (collector.filter !== undefined && !collector.filter(...args)) {
					continue;
				}

				collector.dispatchCollect?.(...args);
			}
		}

		await this.#services.dispatchEvent(guildId, event, { args });
	}

	#registerCollector(event: Event, collector: Collector<Event>): void {
		this.#log.info(`Registering collector for event '${event}'...`);

		const collectors = this.#collectors.get(event);
		if (collectors === undefined) {
			this.#collectors.set(event, new Set([collector]));
			return;
		}

		collectors.add(collector);
	}

	#unregisterCollector(event: Event, collector: Collector<Event>): void {
		const collectors = this.#collectors.get(event);
		if (collectors === undefined) {
			throw `StateError: Collectors for event "${event}" unexpectedly missing.`;
		}

		collectors.delete(collector);
	}

	async registerCollector<Event extends keyof Discord.EventHandlers>(
		event: Event,
		collector: Collector<Event>,
	): Promise<void> {
		this.#registerCollector(event, collector);

		collector.initialise();

		collector.done.then(() => {
			this.#unregisterCollector(event, collector);
		});
	}
}

class ServiceStore {
	readonly global: {
		readonly lavalink: LavalinkService;
		readonly interactionRepetition: InteractionRepetitionService;
		readonly realtimeUpdates: RealtimeUpdateService;
		readonly status: StatusService;
	};
	readonly local: {
		readonly alerts: Map<bigint, AlertService>;
		readonly dynamicVoiceChannels: Map<bigint, DynamicVoiceChannelService>;
		readonly entry: Map<bigint, EntryService>;
		readonly journalling: Map<bigint, JournallingService>;
		readonly music: Map<bigint, MusicService>;
		readonly notices: {
			readonly information: Map<bigint, InformationNoticeService>;
			readonly resources: Map<bigint, ResourceNoticeService>;
			readonly roles: Map<bigint, RoleNoticeService>;
			readonly welcome: Map<bigint, WelcomeNoticeService>;
		};
		readonly prompts: {
			readonly verification: Map<bigint, VerificationService>;
			readonly reports: Map<bigint, ReportService>;
			readonly resources: Map<bigint, ResourceService>;
			readonly suggestions: Map<bigint, SuggestionService>;
			readonly tickets: Map<bigint, TicketService>;
		};
		readonly roleIndicators: Map<bigint, RoleIndicatorService>;
	};

	readonly #log: Logger;
	readonly #collection: {
		/** Singular services running across all guilds. */
		readonly global: Service[];

		/** Particular services running under specific guilds. */
		readonly local: Map<bigint, Service[]>;
	};

	constructor({ client, isDebug }: { client: Client; isDebug?: boolean }) {
		this.global = {
			lavalink: new LavalinkService(client),
			interactionRepetition: new InteractionRepetitionService(client),
			realtimeUpdates: new RealtimeUpdateService(client),
			status: new StatusService(client),
		};
		this.local = {
			alerts: new Map(),
			dynamicVoiceChannels: new Map(),
			entry: new Map(),
			journalling: new Map(),
			music: new Map(),
			notices: {
				information: new Map(),
				resources: new Map(),
				roles: new Map(),
				welcome: new Map(),
			},
			prompts: {
				verification: new Map(),
				reports: new Map(),
				resources: new Map(),
				suggestions: new Map(),
				tickets: new Map(),
			},
			roleIndicators: new Map(),
		};

		this.#log = Logger.create({ identifier: "Client/ServiceStore", isDebug });
		this.#collection = { global: [], local: new Map() };
	}

	async start(): Promise<void> {
		this.#log.info("Starting global services...");

		const services = Object.values(this.global);

		const promises = [];
		for (const service of services) {
			promises.push(service.start());
		}
		await Promise.all(promises);

		this.#collection.global.push(...services);
	}

	async stop(): Promise<void> {
		this.#log.info("Stopping services...");

		const promises: Promise<void>[] = [];
		for (const services of this.#collection.local.values()) {
			promises.push(this.#stopServices(services));
		}
		await Promise.all(promises);

		await this.#stopServices(this.#collection.global);
	}

	async startLocal(
		client: Client,
		{ guildId, guildDocument }: { guildId: bigint; guildDocument: Guild },
	): Promise<void> {
		const services: Service[] = [];

		if (guildDocument.areEnabled("informationFeatures")) {
			if (guildDocument.isEnabled("journalling")) {
				const service = new JournallingService(client, { guildId });
				services.push(service);

				this.local.journalling.set(guildId, service);
			}

			if (guildDocument.areEnabled("noticeFeatures")) {
				if (guildDocument.isEnabled("informationNotice")) {
					const service = new InformationNoticeService(client, { guildId });
					services.push(service);

					this.local.notices.information.set(guildId, service);
				}

				if (guildDocument.isEnabled("resourceNotice")) {
					const service = new ResourceNoticeService(client, { guildId });
					services.push(service);

					this.local.notices.resources.set(guildId, service);
				}

				if (guildDocument.isEnabled("roleNotice")) {
					const service = new RoleNoticeService(client, { guildId });
					services.push(service);

					this.local.notices.roles.set(guildId, service);
				}

				if (guildDocument.isEnabled("welcomeNotice")) {
					const service = new WelcomeNoticeService(client, { guildId });
					services.push(service);

					this.local.notices.welcome.set(guildId, service);
				}
			}
		}

		if (guildDocument.areEnabled("moderationFeatures")) {
			if (guildDocument.areEnabled("alerts")) {
				const service = new AlertService(client, { guildId });
				services.push(service);

				this.local.alerts.set(guildId, service);
			}

			if (guildDocument.areEnabled("reports")) {
				const service = new ReportService(client, { guildId });
				services.push(service);

				this.local.prompts.reports.set(guildId, service);
			}

			if (guildDocument.isEnabled("verification")) {
				const service = new VerificationService(client, { guildId });
				services.push(service);

				this.local.prompts.verification.set(guildId, service);
			}
		}

		if (guildDocument.areEnabled("serverFeatures")) {
			if (guildDocument.areEnabled("dynamicVoiceChannels")) {
				const service = new DynamicVoiceChannelService(client, { guildId });
				services.push(service);

				this.local.dynamicVoiceChannels.set(guildId, service);
			}

			if (guildDocument.isEnabled("entry")) {
				const service = new EntryService(client, { guildId });
				services.push(service);

				this.local.entry.set(guildId, service);
			}

			if (guildDocument.areEnabled("roleIndicators")) {
				const service = new RoleIndicatorService(client, { guildId });
				services.push(service);

				this.local.roleIndicators.set(guildId, service);
			}

			if (guildDocument.areEnabled("suggestions")) {
				const service = new SuggestionService(client, { guildId });
				services.push(service);

				this.local.prompts.suggestions.set(guildId, service);
			}

			if (guildDocument.areEnabled("tickets")) {
				const service = new TicketService(client, { guildId });
				services.push(service);

				this.local.prompts.tickets.set(guildId, service);
			}

			if (guildDocument.areEnabled("resources")) {
				const service = new ResourceService(client, { guildId });
				services.push(service);

				this.local.prompts.resources.set(guildId, service);
			}
		}

		if (guildDocument.areEnabled("socialFeatures")) {
			if (guildDocument.isEnabled("music")) {
				const service = new MusicService(client, { guildId });
				services.push(service);

				this.local.music.set(guildId, service);
			}
		}

		this.#collection.local.set(guildId, services);

		const promises = [];
		for (const service of services) {
			promises.push(service.start());
		}
		await Promise.all(promises);
	}

	async stopLocal(guildId: bigint): Promise<void> {
		if (!this.#collection.local.has(guildId)) {
			return;
		}

		const services = this.#collection.local.get(guildId)!;

		this.#collection.local.delete(guildId);

		await this.#stopServices(services);
	}

	async #stopServices(services: Service[]): Promise<void> {
		const promises: Promise<void>[] = [];
		for (const service of services) {
			promises.push(service.stop());
		}
		await Promise.all(promises);
	}

	async dispatchToGlobal<EventName extends keyof Discord.EventHandlers>(
		eventName: EventName,
		{ args }: { args: Parameters<Discord.EventHandlers[EventName]> },
	): Promise<void> {
		for (const service of this.#collection.global) {
			// @ts-ignore: This is fine.
			service[eventName](...args);
		}
	}

	async dispatchToLocal<EventName extends keyof Discord.EventHandlers>(
		guildId: bigint | undefined,
		eventName: EventName,
		{ args }: { args: Parameters<Discord.EventHandlers[EventName]> },
	): Promise<void> {
		if (guildId === undefined) {
			return;
		}

		const services = this.#collection.local.get(guildId);
		if (services === undefined) {
			return;
		}

		for (const service of services) {
			// @ts-ignore: This is fine.
			service[eventName](...args);
		}
	}

	async dispatchEvent<EventName extends keyof Discord.EventHandlers>(
		guildId: bigint | undefined,
		eventName: EventName,
		{ args }: { args: Parameters<Discord.EventHandlers[EventName]> },
	): Promise<void> {
		this.dispatchToGlobal(eventName, { args });

		if (guildId !== undefined) {
			this.dispatchToLocal(guildId, eventName, { args });
		}
	}

	getAlertService(guildId: bigint): AlertService | undefined {
		return this.local.alerts.get(guildId);
	}

	getDynamicVoiceChannelService(guildId: bigint): DynamicVoiceChannelService | undefined {
		return this.local.dynamicVoiceChannels.get(guildId);
	}

	getEntryService(guildId: bigint): EntryService | undefined {
		return this.local.entry.get(guildId);
	}

	getJournallingService(guildId: bigint): JournallingService | undefined {
		return this.local.journalling.get(guildId);
	}

	getMusicService(guildId: bigint): MusicService | undefined {
		return this.local.music.get(guildId);
	}

	getRoleIndicatorService(guildId: bigint): RoleIndicatorService | undefined {
		return this.local.roleIndicators.get(guildId);
	}

	getNoticeService(guildId: bigint, { type }: { type: "information" }): InformationNoticeService | undefined;
	getNoticeService(guildId: bigint, { type }: { type: "resources" }): ResourceNoticeService | undefined;
	getNoticeService(guildId: bigint, { type }: { type: "roles" }): RoleNoticeService | undefined;
	getNoticeService(guildId: bigint, { type }: { type: "welcome" }): WelcomeNoticeService | undefined;
	getNoticeService(
		guildId: bigint,
		{ type }: { type: keyof ServiceStore["local"]["notices"] },
	): NoticeService<{ type: typeof type }> | undefined {
		switch (type) {
			case "information": {
				return this.local.notices.information.get(guildId);
			}
			case "resources": {
				return this.local.notices.resources.get(guildId);
			}
			case "roles": {
				return this.local.notices.roles.get(guildId);
			}
			case "welcome": {
				return this.local.notices.welcome.get(guildId);
			}
		}
	}

	getPromptService(guildId: bigint, { type }: { type: "verification" }): VerificationService | undefined;
	getPromptService(guildId: bigint, { type }: { type: "reports" }): ReportService | undefined;
	getPromptService(guildId: bigint, { type }: { type: "resources" }): ResourceService | undefined;
	getPromptService(guildId: bigint, { type }: { type: "suggestions" }): SuggestionService | undefined;
	getPromptService(guildId: bigint, { type }: { type: "tickets" }): TicketService | undefined;
	getPromptService(
		guildId: bigint,
		{ type }: { type: keyof ServiceStore["local"]["prompts"] },
	): PromptService | undefined {
		switch (type) {
			case "verification": {
				return this.local.prompts.verification.get(guildId);
			}
			case "reports": {
				return this.local.prompts.reports.get(guildId);
			}
			case "resources": {
				return this.local.prompts.resources.get(guildId);
			}
			case "suggestions": {
				return this.local.prompts.suggestions.get(guildId);
			}
			case "tickets": {
				return this.local.prompts.tickets.get(guildId);
			}
		}
	}
}

interface MemberNarrowingOptions {
	includeBots: boolean;
	restrictToSelf: boolean;
	restrictToNonSelf: boolean;
	excludeModerators: boolean;
}

class Client {
	readonly environment: Environment;
	readonly log: Logger;
	readonly database: Database;
	readonly cache: Cache;

	readonly #connection: DiscordConnection;
	readonly #localisations: LocalisationStore;
	readonly #commands: CommandStore;
	readonly #interactions: InteractionStore;
	readonly #services: ServiceStore;
	readonly #events: EventStore;

	readonly #_guildCreateCollector: Collector<"guildCreate">;
	readonly #_guildDeleteCollector: Collector<"guildDelete">;
	readonly #_interactionCollector: InteractionCollector;
	readonly #_channelDeleteCollector: Collector<"channelDelete">;

	static #client?: Client;

	get documents(): Database["cache"] {
		return this.database.cache;
	}

	get localise(): LocalisationStore["localise"] {
		return this.#localisations.localise.bind(this.#localisations);
	}

	get localiseUnsafe(): (key: string, locale: Locale | undefined) => LocalisationBuilder | undefined {
		return (key, locale) => {
			if (!this.#localisations.has(key)) {
				return undefined;
			}

			return this.#localisations.localise(key, locale);
		};
	}

	get pluralise(): LocalisationStore["pluralise"] {
		return this.#localisations.pluralise.bind(this.#localisations);
	}

	get isShowable(): CommandStore["isShowable"] {
		return this.#commands.isShowable.bind(this.#commands);
	}

	get registerInteraction(): InteractionStore["registerInteraction"] {
		return this.#interactions.registerInteraction.bind(this.#interactions);
	}

	get unregisterInteraction(): InteractionStore["unregisterInteraction"] {
		return this.#interactions.unregisterInteraction.bind(this.#interactions);
	}

	get acknowledge(): InteractionStore["acknowledge"] {
		return this.#interactions.acknowledge.bind(this.#interactions);
	}

	get postponeReply(): InteractionStore["postponeReply"] {
		return this.#interactions.postponeReply.bind(this.#interactions);
	}

	get reply(): InteractionStore["reply"] {
		return this.#interactions.reply.bind(this.#interactions);
	}

	get editReply(): InteractionStore["editReply"] {
		return this.#interactions.editReply.bind(this.#interactions);
	}

	get deleteReply(): InteractionStore["deleteReply"] {
		return this.#interactions.deleteReply.bind(this.#interactions);
	}

	get respond(): InteractionStore["respond"] {
		return this.#interactions.respond.bind(this.#interactions);
	}

	get displayModal(): InteractionStore["displayModal"] {
		return this.#interactions.displayModal.bind(this.#interactions);
	}

	get lavalinkService(): LavalinkService {
		return this.#services.global.lavalink;
	}

	get interactionRepetitionService(): InteractionRepetitionService {
		return this.#services.global.interactionRepetition;
	}

	get realtimeUpdateService(): RealtimeUpdateService {
		return this.#services.global.realtimeUpdates;
	}

	get statusService(): StatusService {
		return this.#services.global.status;
	}

	get getAlertService() {
		return this.#services.getAlertService.bind(this.#services);
	}

	get getDynamicVoiceChannelService() {
		return this.#services.getDynamicVoiceChannelService.bind(this.#services);
	}

	get getEntryService() {
		return this.#services.getEntryService.bind(this.#services);
	}

	get getJournallingService() {
		return this.#services.getJournallingService.bind(this.#services);
	}

	get getMusicService() {
		return this.#services.getMusicService.bind(this.#services);
	}

	get getRoleIndicatorService() {
		return this.#services.getRoleIndicatorService.bind(this.#services);
	}

	get getNoticeService() {
		return this.#services.getNoticeService.bind(this.#services);
	}

	get getPromptService() {
		return this.#services.getPromptService.bind(this.#services);
	}

	get registerCollector(): EventStore["registerCollector"] {
		return this.#events.registerCollector.bind(this.#events);
	}

	get bot(): DiscordConnection["bot"] {
		return this.#connection.bot;
	}

	get entities(): DiscordConnection["cache"] {
		return this.#connection.cache;
	}

	get registerInteractionCollector(): <Metadata extends string[]>(
		collector: InteractionCollector<Metadata>,
	) => Promise<void> {
		// TODO(vxern): Find a way to get rid of ts-ignore?
		// @ts-ignore: This is fine.
		return (collector) => this.#events.registerCollector("interactionCreate", collector);
	}

	private constructor({
		environment,
		log,
		bot,
		database,
		localisations,
	}: {
		environment: Environment;
		log: Logger;
		bot: Discord.Bot;
		database: Database;
		localisations: RawLocalisations;
	}) {
		const isDebug = environment.isDebug;

		this.environment = environment;
		this.log = log;
		this.database = database;
		this.cache = new Cache();

		this.#localisations = new LocalisationStore({ localisations, isDebug });
		this.#commands = CommandStore.create({
			localisations: this.#localisations,
			templates: Array.from(Object.values(commandTemplates)),
			isDebug,
		});
		this.#interactions = new InteractionStore({ bot, isDebug });
		this.#services = new ServiceStore({ client: this, isDebug });
		this.#events = new EventStore({ services: this.#services, isDebug });
		this.#connection = new DiscordConnection({ bot, events: this.#events.buildEventHandlers(), isDebug });

		this.#_guildCreateCollector = new Collector<"guildCreate">();
		this.#_guildDeleteCollector = new Collector<"guildDelete">();
		this.#_interactionCollector = new InteractionCollector(this, {
			anyType: true,
			anyCustomId: true,
			isPermanent: true,
		});
		this.#_channelDeleteCollector = new Collector<"channelDelete">();
	}

	static async create({
		environment,
		localisations,
		certificate,
	}: {
		environment: Environment;
		localisations: RawLocalisations;
		certificate?: Buffer;
	}): Promise<Client> {
		if (Client.#client !== undefined) {
			return Client.#client;
		}

		const log = Logger.create({ identifier: "Client", isDebug: environment.isDebug });

		log.info("Bootstrapping the client...");

		const database = await Database.create({
			host: environment.ravendbHost,
			database: environment.ravendbDatabase,
			certificate,
		});

		const bot = Discord.createBot({
			token: environment.discordSecret,
			intents:
				Discord.Intents.Guilds |
				Discord.Intents.GuildMembers | // Members joining, leaving, changing.
				Discord.Intents.GuildModeration | // Access to audit log.
				Discord.Intents.GuildVoiceStates |
				Discord.Intents.GuildMessages |
				Discord.Intents.MessageContent,
			// TODO(vxern): Unnecessary.
			events: {},
			gateway: {
				// TODO(vxern): This is unnecessary since it can just be inferred from the top token
				token: environment.discordSecret,
				events: {},
				cache: {
					requestMembers: {
						enabled: true,
						// TODO(vxern): Again, unnecessary.
						pending: new Discord.Collection(),
					},
				},
			},
		});

		return new Client({ environment, log, bot, database, localisations });
	}

	async #setupCollectors(): Promise<void> {
		this.log.info("Setting up event collectors...");

		this.#_guildCreateCollector.onCollect(this.#setupGuild.bind(this));
		this.#_guildDeleteCollector.onCollect((guildId, _) => this.#teardownGuild(guildId));
		this.#_interactionCollector.onCollect(this.handleInteraction.bind(this));
		this.#_channelDeleteCollector.onCollect((channel) => {
			this.#connection.cache.channels.delete(channel.id);

			if (channel.guildId !== undefined) {
				this.#connection.cache.guilds.get(channel.guildId)?.channels.delete(channel.id);
			}
		});

		await this.registerCollector("guildCreate", this.#_guildCreateCollector);
		await this.registerCollector("guildDelete", this.#_guildDeleteCollector);
		await this.registerInteractionCollector(this.#_interactionCollector);
		await this.registerCollector("channelDelete", this.#_channelDeleteCollector);
	}

	#teardownCollectors(): void {
		this.log.info("Tearing down event collectors...");

		this.#_guildCreateCollector.close();
		this.#_guildDeleteCollector.close();
		this.#_channelDeleteCollector.close();
		this.#_interactionCollector.close();
	}

	async #setupGuild(
		guild: Discord.Guild | Logos.Guild,
		options: { isUpdate: boolean } = { isUpdate: false },
	): Promise<void> {
		if (!options.isUpdate) {
			this.log.info(`Logos added to "${guild.name}" (ID ${guild.id}).`);
		}

		const guildDocument = await Guild.getOrCreate(this, { guildId: guild.id.toString() });

		await GuildStats.getOrCreate(this, { guildId: guild.id.toString() });

		await this.#services.startLocal(this, { guildId: guild.id, guildDocument });

		this.bot.rest
			.upsertGuildApplicationCommands(guild.id, this.#commands.getEnabledCommands(guildDocument))
			.catch((reason) => this.log.warn(`Failed to upsert commands on ${diagnostics.display.guild(guild)}:`, reason));

		if (!options.isUpdate) {
			this.log.info(`Fetching ~${guild.memberCount} members of ${diagnostics.display.guild(guild)}...`);

			const members = await this.bot.gateway
				.requestMembers(guild.id, { limit: 0, query: "", nonce: Date.now().toString() })
				.catch((reason) => {
					this.log.warn(`Failed to fetch members of ${diagnostics.display.guild(guild)}:`, reason);
					return [];
				});
			for (const member of members) {
				this.bot.transformers.member(this.bot, member as unknown as Discord.DiscordMember, guild.id, member.user.id);
			}

			this.log.info(`Fetched ~${guild.memberCount} members of ${diagnostics.display.guild(guild)}.`);
		}
	}

	async #teardownGuild(guildId: bigint): Promise<void> {
		await this.#services.stopLocal(guildId);
	}

	async start(): Promise<void> {
		await this.#services.start();
		await this.#setupCollectors();
		await this.#connection.open();
	}

	async stop(): Promise<void> {
		await this.#services.stop();
		this.#teardownCollectors();
		await this.#connection.close();
	}

	// TODO(vxern): Add some kind of locking mechanism.
	async reloadGuild(guildId: bigint): Promise<void> {
		const guild = this.#connection.cache.guilds.get(guildId);
		if (guild === undefined) {
			return;
		}

		await this.#teardownGuild(guildId);
		await this.#setupGuild(guild, { isUpdate: true });
	}

	async handleInteraction(interaction: Logos.Interaction): Promise<void> {
		// If it's a "none" interaction, just acknowledge and good to go.
		if (interaction.metadata[0] === constants.components.none) {
			this.acknowledge(interaction);
			return;
		}

		const handle = this.#commands.getHandler(interaction);
		if (handle === undefined) {
			return;
		}

		const executedAt = Date.now();

		if (this.#commands.hasRateLimit(interaction)) {
			const rateLimit = this.#commands.getRateLimit(this, interaction, { executedAt });
			if (rateLimit !== undefined) {
				const nextAllowedUsageTimestampFormatted = timestamp(rateLimit.nextAllowedUsageTimestamp);

				const locale = interaction.locale;

				const strings = {
					title: this.localise("interactions.rateLimited.title", locale)(),
					description: {
						tooManyUses: this.localise(
							"interactions.rateLimited.description.tooManyUses",
							locale,
						)({ times: defaults.COMMAND_RATE_LIMIT.uses }),
						cannotUseUntil: this.localise(
							"interactions.rateLimited.description.cannotUseAgainUntil",
							locale,
						)({ relative_timestamp: nextAllowedUsageTimestampFormatted }),
					},
				};

				setTimeout(() => this.deleteReply(interaction), rateLimit.nextAllowedUsageTimestamp - executedAt - time.second);

				this.reply(interaction, {
					embeds: [
						{
							title: strings.title,
							description: `${strings.description.tooManyUses}\n\n${strings.description.cannotUseUntil}`,
							color: constants.colors.dullYellow,
						},
					],
				});

				return;
			}
		}

		try {
			await handle(this, interaction);
		} catch (exception) {
			this.log.error(exception);
		}
	}

	resolveIdentifierToMembers({
		guildId,
		seekerUserId,
		identifier,
		options,
	}: {
		guildId: bigint;
		seekerUserId: bigint;
		identifier: string;
		options?: Partial<MemberNarrowingOptions>;
	}): [members: Logos.Member[], isResolved: boolean] | undefined {
		if (identifier.trim().length === 0) {
			return [[], false];
		}

		const seeker = this.#connection.cache.members.get(Discord.snowflakeToBigint(`${seekerUserId}${guildId}`));
		if (seeker === undefined) {
			return undefined;
		}

		const guild = this.#connection.cache.guilds.get(guildId);
		if (guild === undefined) {
			return undefined;
		}

		const moderatorRoleIds = guild.roles
			.array()
			.filter((role) => role.permissions.has("MODERATE_MEMBERS"))
			.map((role) => role.id);

		const id = extractIDFromIdentifier(identifier);
		if (id !== undefined) {
			const member = this.#connection.cache.members.get(Discord.snowflakeToBigint(`${id}${guildId}`));
			if (member === undefined) {
				return undefined;
			}

			if (options?.restrictToSelf && member.id !== seeker.id) {
				return undefined;
			}

			if (options?.restrictToNonSelf && member.id === seeker.id) {
				return undefined;
			}

			if (options?.excludeModerators && moderatorRoleIds.some((roleId) => member.roles.includes(roleId))) {
				return undefined;
			}

			return [[member], true];
		}

		const cachedMembers = options?.restrictToSelf ? [seeker] : guild.members.array();
		const members = cachedMembers.filter(
			(member) =>
				(options?.restrictToNonSelf ? member.user?.id !== seeker.user?.id : true) &&
				(options?.excludeModerators ? !moderatorRoleIds.some((roleId) => member.roles.includes(roleId)) : true),
		);

		if (constants.patterns.discord.userHandle.old.test(identifier)) {
			const identifierLowercase = identifier.toLowerCase();
			const member = members.find(
				(member) =>
					member.user !== undefined &&
					`${member.user.username.toLowerCase()}#${member.user.discriminator}`.includes(identifierLowercase),
			);
			if (member === undefined) {
				return [[], false];
			}

			return [[member], true];
		}

		if (constants.patterns.discord.userHandle.new.test(identifier)) {
			const identifierLowercase = identifier.toLowerCase();
			const member = members.find((member) => member.user?.username?.toLowerCase().includes(identifierLowercase));
			if (member === undefined) {
				return [[], false];
			}

			return [[member], true];
		}

		const identifierLowercase = identifier.toLowerCase();
		const matchedMembers = members.filter((member) => {
			if (member.user?.toggles?.has("bot") && !options?.includeBots) {
				return false;
			}

			if (
				member.user &&
				`${member.user.username.toLowerCase()}#${member.user.discriminator}`.includes(identifierLowercase)
			) {
				return true;
			}

			if (member.user?.username.toLowerCase().includes(identifierLowercase)) {
				return true;
			}

			if (member.nick?.toLowerCase().includes(identifierLowercase)) {
				return true;
			}

			return false;
		});

		return [matchedMembers, false];
	}

	resolveInteractionToMember(
		interaction: Logos.Interaction,
		{
			identifier,
			options,
		}: {
			identifier: string;
			options?: Partial<MemberNarrowingOptions>;
		},
		{ locale }: { locale: Locale },
	): Logos.Member | undefined {
		const guildId = interaction.guildId;
		if (guildId === undefined) {
			return undefined;
		}

		const result = this.resolveIdentifierToMembers({ guildId, seekerUserId: interaction.user.id, identifier, options });
		if (result === undefined) {
			return;
		}

		const [matchedMembers, isResolved] = result;
		if (isResolved) {
			return matchedMembers.at(0);
		}

		if (matchedMembers.length === 0) {
			if (
				interaction.type === Discord.InteractionTypes.ApplicationCommand ||
				interaction.type === Discord.InteractionTypes.MessageComponent ||
				interaction.type === Discord.InteractionTypes.ModalSubmit
			) {
				const strings = {
					title: this.localise("interactions.invalidUser.title", locale)(),
					description: this.localise("interactions.invalidUser.description", locale)(),
				};

				this.reply(interaction, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.red,
						},
					],
				});
			}

			return undefined;
		}

		return matchedMembers.at(0);
	}

	async autocompleteMembers(
		interaction: Logos.Interaction,
		{
			identifier,
			options,
		}: {
			identifier: string;
			options?: Partial<MemberNarrowingOptions>;
		},
	): Promise<void> {
		const identifierTrimmed = identifier.trim();
		if (identifierTrimmed.length === 0) {
			const locale = interaction.locale;

			const strings = {
				autocomplete: this.localise("autocomplete.user", locale)(),
			};

			this.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
			return;
		}

		const guildId = interaction.guildId;
		if (guildId === undefined) {
			return undefined;
		}

		const result = this.resolveIdentifierToMembers({
			guildId,
			seekerUserId: interaction.user.id,
			identifier: identifierTrimmed,
			options,
		});
		if (result === undefined) {
			return;
		}

		const [matchedMembers, _] = result;

		const users: Logos.User[] = [];
		for (const member of matchedMembers) {
			if (users.length === 20) {
				break;
			}

			const user = member.user;
			if (user === undefined) {
				continue;
			}

			users.push(user);
		}

		this.respond(
			interaction,
			users.map((user) => ({ name: diagnostics.display.user(user, { prettify: true }), value: user.id.toString() })),
		);
	}
}

function isValidSnowflake(snowflake: string): boolean {
	return constants.patterns.discord.snowflake.test(snowflake);
}

function extractIDFromIdentifier(identifier: string): string | undefined {
	return (
		constants.patterns.discord.snowflake.exec(identifier)?.at(1) ??
		constants.patterns.discord.userMention.exec(identifier)?.at(1) ??
		constants.patterns.userDisplay.exec(identifier)?.at(1)
	);
}

function isValidIdentifier(identifier: string): boolean {
	return (
		constants.patterns.discord.snowflake.test(identifier) ||
		constants.patterns.discord.userMention.test(identifier) ||
		constants.patterns.userDisplay.test(identifier) ||
		constants.patterns.discord.userHandle.new.test(identifier) ||
		constants.patterns.discord.userHandle.old.test(identifier)
	);
}

export {
	Client,
	Collector,
	Database,
	Logger,
	InteractionCollector,
	isValidIdentifier,
	isValidSnowflake,
	ServiceStore,
	InteractionStore,
};
