import configuration from "../configuration.js";
import constants, { Periods } from "../constants.js";
import { timestamp } from "../formatting.js";
import { Language, defaultLanguage, getLanguageByLocale, getLocaleForLanguage, supportedLanguages } from "../types.js";
import { Command, CommandTemplate, InteractionHandler, LocalisationProperties, Option } from "./commands/command.js";
import commandTemplates from "./commands/commands.js";
import { SentencePair } from "./commands/language/commands/game.js";
import { DictionaryAdapter } from "./commands/language/dictionaries/adapter.js";
import { SupportedLanguage } from "./commands/language/module.js";
import { Database, createDatabase } from "./database/database.js";
import { acknowledge, deleteReply, isAutocomplete, reply, respond } from "./interactions.js";
import localisationTransformers from "./localisation/transformers.js";
import { setupLogging } from "./services/logging/logging.js";
import { MusicController, setupMusicController } from "./services/music/music.js";
import services from "./services/services.js";
import { diagnosticMentionUser } from "./utils.js";
import {
	ApplicationCommandOptionTypes,
	Bot,
	Channel,
	DiscordMessage,
	EventHandlers,
	Guild,
	Intents,
	Interaction,
	InteractionDataOption,
	Locales,
	Localization as DiscordLocalisations,
	Member,
	Message,
	Transformers,
	User,
	calculatePermissions,
	createBot,
	createTransformers,
	fetchMembers,
	send as sendShardPayload,
	snowflakeToBigint,
	startBot,
	upsertGuildApplicationCommands,
} from "discordeno";
import * as FancyLog from "fancy-log";
import * as Lavaclient from "lavaclient";
import * as MessagePipe from "messagepipe";
import * as Sentry from "sentry";

interface Collector<ForEvent extends keyof EventHandlers> {
	filter: (...args: Parameters<EventHandlers[ForEvent]>) => boolean;
	limit?: number;
	removeAfter?: number;
	onCollect: (...args: Parameters<EventHandlers[ForEvent]>) => void;
	onEnd: () => void;
}

type Event = keyof EventHandlers;

type WithLanguage<T> = T & { language: Language };

type Client = Readonly<{
	metadata: {
		environment: {
			environment: "production" | "staging" | "development" | "restricted";
			discordSecret: string;
			faunaSecret: string;
			deeplSecret: string;
			sentrySecret: string;
			lavalinkHost: string;
			lavalinkPort: string;
			lavalinkPassword: string;
		};
		supportedTranslationLanguages: SupportedLanguage[];
	};
	log: Record<"debug" | keyof typeof FancyLog, (...args: unknown[]) => void>;
	cache: {
		guilds: Map<bigint, WithLanguage<Guild>>;
		users: Map<bigint, User>;
		members: Map<bigint, Member>;
		channels: Map<bigint, Channel>;
		messages: {
			latest: Map<bigint, Message>;
			previous: Map<bigint, Message>;
		};
	};
	database: Database;
	commands: {
		global: Command[];
		local: Command[];
		handlers: {
			execute: Map<string, InteractionHandler>;
			autocomplete: Map<string, InteractionHandler>;
		};
	};
	collectors: Map<Event, Set<Collector<Event>>>;
	features: {
		dictionaryAdapters: Map<Language, DictionaryAdapter[]>;
		sentencePairs: Map<Language, SentencePair[]>;
		music: {
			node: Lavaclient.Node;
			controllers: Map<bigint, MusicController>;
		};
		// The keys are user IDs, the values are command usage timestamps mapped by command IDs.
		rateLimiting: Map<bigint, Map<bigint, number[]>>;
	};
	localisation: {
		compilers: Record<Language, CompiledLocalisation>;
		localisations: Map<string, Map<Language, (args: Record<string, unknown>) => string>>;
	};
}>;

type CompiledLocalisation = ReturnType<typeof MessagePipe.MessagePipe>["compile"];

function createClient(
	metadata: Client["metadata"],
	features: Client["features"],
	localisationsStatic: Map<string, Map<Language, string>>,
): Client {
	const localisation = createLocalisations(localisationsStatic);

	const local = localiseCommands(localisation.localisations, commandTemplates.local);
	const global = localiseCommands(localisation.localisations, commandTemplates.global);

	const handlers = createCommandHandlers(commandTemplates.local);

	return {
		metadata,
		log: {
			default: (...args: unknown[]) => {
				FancyLog.info(...args);
			},
			debug: (...args: unknown[]) => {
				FancyLog.info(...args);
			},
			info: (...args: unknown[]) => {
				FancyLog.info(...args);
			},
			dir: (...args: unknown[]) => {
				FancyLog.dir(...args);
			},
			error: (...args: unknown[]) => {
				FancyLog.error(...args);
			},
			warn: (...args: unknown[]) => {
				FancyLog.warn(args);
			},
		},
		cache: createCache(),
		database: createDatabase(metadata.environment),
		features,
		localisation,
		commands: { local, global, handlers },
		collectors: new Map(),
	};
}

function createCache(): Client["cache"] {
	return {
		guilds: new Map(),
		users: new Map(),
		members: new Map(),
		channels: new Map(),
		messages: {
			latest: new Map(),
			previous: new Map(),
		},
	};
}

async function initialiseClient(
	metadata: Client["metadata"],
	features: Omit<Client["features"], "music">,
	localisations: Map<string, Map<Language, string>>,
): Promise<void> {
	const musicFeature = createMusicFeature(metadata.environment, async (guildId, payload) => {
		const shardId = client.cache.guilds.get(BigInt(guildId))?.shardId;
		if (shardId === undefined) {
			return;
		}

		const shard = bot.gateway.manager.shards.find((shard) => shard.id === shardId);
		if (shard === undefined) {
			return;
		}

		sendShardPayload(shard, payload, true);
	});

	const client = createClient(metadata, { ...features, music: musicFeature }, localisations);

	await prefetchDataFromDatabase(client, client.database);

	const bot = overrideDefaultEventHandlers(
		createBot({
			token: metadata.environment.discordSecret,
			intents:
				Intents.Guilds |
				Intents.GuildMembers |
				Intents.GuildBans |
				Intents.GuildVoiceStates |
				Intents.GuildMessages |
				Intents.MessageContent,
			events: withMusicEvents(client, createEventHandlers(client), client.features.music.node),
			transformers: withCaching(client, createTransformers({})),
		}),
	);

	startServices([client, bot]);

	setupLavalinkNode([client, bot]);

	startBot(bot).then(() => [client, bot]);
}

async function prefetchDataFromDatabase(client: Client, database: Database): Promise<void> {
	await Promise.all([
		database.adapters.entryRequests.prefetch(client),
		database.adapters.reports.prefetch(client),
		database.adapters.suggestions.prefetch(client),
	]);
}

function createMusicFeature(
	environment: Client["metadata"]["environment"],
	sendGatewayPayload: Lavaclient.Node["sendGatewayPayload"],
): Client["features"]["music"] {
	const node = new Lavaclient.Node({
		connection: {
			host: environment.lavalinkHost,
			port: Number(environment.lavalinkPort),
			password: environment.lavalinkPassword,
		},
		sendGatewayPayload,
	});

	return {
		node,
		controllers: new Map(),
	};
}

function withMusicEvents(
	client: Client,
	events: Partial<EventHandlers>,
	node: Lavaclient.Node,
): Partial<EventHandlers> {
	return {
		...events,
		voiceStateUpdate: async (_, { sessionId, channelId, guildId, userId }) =>
			node.handleVoiceUpdate({
				session_id: sessionId,
				channel_id: channelId !== undefined ? `${channelId}` : null,
				guild_id: `${guildId}`,
				user_id: `${userId}`,
			}),
		voiceServerUpdate: async (_, { token, endpoint, guildId }) => {
			if (endpoint === undefined) {
				client.log.info(`Discarding voice server update for guild with ID ${guildId}: The endpoint is undefined.`);
				return;
			}

			node.handleVoiceUpdate({ token, endpoint, guild_id: `${guildId}` });
		},
	};
}

function overrideDefaultEventHandlers(bot: Bot): Bot {
	bot.handlers.MESSAGE_UPDATE = (bot, data) => {
		const messageData = data.d as DiscordMessage;
		if (!("author" in messageData)) {
			return;
		}

		bot.events.messageUpdate(bot, bot.transformers.message(bot, messageData));
	};

	return bot;
}

function createEventHandlers(client: Client): Partial<EventHandlers> {
	return {
		ready: (bot, payload) => {
			const { shardId } = payload;

			const shard = bot.gateway.manager.shards.find((shard) => shard.id === shardId);
			if (shard !== undefined && shard.socket !== undefined) {
				shard.socket.onerror = () => {};
			}
		},
		guildCreate: async (bot, guild) => {
			const commands = (() => {
				if (isServicing(client, guild.id)) {
					return client.commands.local;
				}

				return client.commands.global;
			})();

			upsertGuildApplicationCommands(bot, guild.id, commands).catch((reason) =>
				client.log.warn(`Failed to upsert commands: ${reason}`),
			);

			registerGuild(client, guild);

			setupMusicController(client, guild.id);

			if (!isServicing(client, guild.id)) {
				return;
			}

			setupLogging([client, bot], guild);

			fetchMembers(bot, guild.id, { limit: 0, query: "" }).catch((reason) =>
				client.log.warn(`Failed to fetch members for guild with ID ${guild.id}: ${reason}`),
			);
		},
		channelDelete: (_, channel) => {
			client.cache.channels.delete(channel.id);
			client.cache.guilds.get(channel.guildId)?.channels.delete(channel.id);
		},
		interactionCreate: async (bot, interaction) => {
			if (interaction.data?.customId === constants.staticComponentIds.none) {
				acknowledge([client, bot], interaction);
				return;
			}

			const commandName = interaction.data?.name;
			if (commandName === undefined) {
				return;
			}

			const subCommandGroupOption = interaction.data?.options?.find((option) => isSubcommandGroup(option));

			let commandNameFull: string;
			if (subCommandGroupOption !== undefined) {
				const subCommandGroupName = subCommandGroupOption.name;
				const subCommandName = subCommandGroupOption.options?.find((option) => isSubcommand(option))?.name;
				if (subCommandName === undefined) {
					return;
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

			let handle: InteractionHandler | undefined;
			if (isAutocomplete(interaction)) {
				handle = client.commands.handlers.autocomplete.get(commandNameFull);
			} else {
				handle = client.commands.handlers.execute.get(commandNameFull);
			}
			if (handle === undefined) {
				return;
			}

			Promise.resolve(handle([client, bot], interaction)).catch((exception) => {
				Sentry.captureException(exception);
				client.log.error(exception);
			});
		},
	};
}

function withCaching(client: Client, transformers: Transformers): Transformers {
	const { guild, user, member, channel, message, role, voiceState } = transformers;

	transformers.guild = (bot, payload) => {
		const result = guild(bot, payload);

		for (const channel of payload.guild.channels ?? []) {
			bot.transformers.channel(bot, { channel, guildId: result.id });
		}

		return result;
	};

	transformers.user = (...args) => {
		const result = user(...args);

		client.cache.users.set(result.id, result);

		return result;
	};

	transformers.member = (bot, payload, ...args) => {
		const result = member(bot, payload, ...args);

		const memberSnowflake = bot.transformers.snowflake(`${result.id}${result.guildId}`);

		client.cache.members.set(memberSnowflake, result);

		client.cache.guilds.get(result.guildId)?.members.set(result.id, result);

		return result;
	};

	transformers.channel = (...args) => {
		const result = channel(...args);

		client.cache.channels.set(result.id, result);

		client.cache.guilds.get(result.guildId)?.channels.set(result.id, result);

		return result;
	};

	transformers.message = (bot, payload) => {
		const result = message(bot, payload);

		const previousMessage = client.cache.messages.latest.get(result.id);
		if (previousMessage !== undefined) {
			client.cache.messages.previous.set(result.id, previousMessage);
		}

		client.cache.messages.latest.set(result.id, result);

		const user = bot.transformers.user(bot, payload.author);

		client.cache.users.set(user.id, user);

		if (payload.member !== undefined && payload.guild_id !== undefined) {
			const guildId = bot.transformers.snowflake(payload.guild_id);

			const member = bot.transformers.member(bot, { ...payload.member, user: payload.author }, guildId, user.id);

			const memberSnowflake = bot.transformers.snowflake(`${member.id}${member.guildId}`);

			client.cache.members.set(memberSnowflake, member);
		}

		return result;
	};

	transformers.role = (bot, payload) => {
		const result = role(bot, payload);

		client.cache.guilds.get(result.guildId)?.roles.set(result.id, result);

		return result;
	};

	transformers.voiceState = (bot, payload) => {
		const result = voiceState(bot, payload);

		client.cache.guilds.get(result.guildId)?.voiceStates.set(result.userId, result);

		return result;
	};

	return transformers;
}

function withRateLimiting(handle: InteractionHandler): InteractionHandler {
	return async ([client, bot], interaction) => {
		if (isAutocomplete(interaction)) {
			return;
		}

		const commandId = interaction.data?.id;
		if (commandId === undefined) {
			return handle([client, bot], interaction);
		}

		const executedAt = Date.now();

		const timestampsByCommandId = client.features.rateLimiting.get(interaction.user.id) ?? new Map();
		const timestamps = [...(timestampsByCommandId.get(commandId) ?? []), executedAt];
		const activeTimestamps = timestamps.filter(
			(timestamp) => Date.now() - timestamp <= configuration.rateLimiting.within,
		);

		if (activeTimestamps.length > configuration.rateLimiting.limit) {
			const firstTimestamp = activeTimestamps.at(0);
			if (firstTimestamp) {
				throw "StateError: Unexpected undefined initial timestamp.";
			}

			const now = Date.now();

			const nextValidUsageTimestamp = now + configuration.rateLimiting.within - (now - firstTimestamp);
			const nextValidUsageTimestampFormatted = timestamp(nextValidUsageTimestamp);

			const strings = {
				title: localise(client, "interactions.rateLimited.title", interaction.locale)(),
				description: {
					tooManyUses: localise(
						client,
						"interactions.rateLimited.description.tooManyUses",
						interaction.locale,
					)({ times: configuration.rateLimiting.limit }),
					cannotUseUntil: localise(
						client,
						"interactions.rateLimited.description.cannotUseAgainUntil",
						interaction.locale,
					)({ relative_timestamp: nextValidUsageTimestampFormatted }),
				},
			};

			setTimeout(() => deleteReply([client, bot], interaction), nextValidUsageTimestamp - now - Periods.second);

			reply([client, bot], interaction, {
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

		timestampsByCommandId.set(commandId, activeTimestamps);

		return handle([client, bot], interaction);
	};
}

function localiseCommands(
	localisations: Client["localisation"]["localisations"],
	commandTemplates: CommandTemplate[],
): Command[] {
	function localiseCommandOrOption(key: string): Pick<Command, LocalisationProperties> | undefined {
		const optionName = key.split(".")?.at(-1);
		if (optionName === undefined) {
			console.warn(`Failed to get option name from localisation key '${key}'.`);
			return undefined;
		}

		const nameLocalisationsAll = localisations.get(`${key}.name`) ?? localisations.get(`parameters.${optionName}.name`);
		const nameLocalisations =
			nameLocalisationsAll !== undefined ? toDiscordLocalisations(nameLocalisationsAll) : undefined;

		const descriptionLocalisationsAll =
			localisations.get(`${key}.description`) ?? localisations.get(`parameters.${optionName}.description`);
		const description = descriptionLocalisationsAll?.get(defaultLanguage)?.({});
		const descriptionLocalisations =
			descriptionLocalisationsAll !== undefined ? toDiscordLocalisations(descriptionLocalisationsAll) : undefined;

		return {
			nameLocalizations: nameLocalisations ?? {},
			description: description ?? localisations.get("noDescription")?.get(defaultLanguage)?.({}) ?? "No description.",
			descriptionLocalizations: descriptionLocalisations ?? {},
		};
	}

	const commands: Command[] = [];
	for (const commandTemplate of commandTemplates) {
		const commandKey = commandTemplate.name;
		const localisations = localiseCommandOrOption(commandKey);
		if (localisations === undefined) {
			continue;
		}

		const command: Command = { ...localisations, ...commandTemplate, options: [] };

		for (const optionTemplate of commandTemplate.options ?? []) {
			const optionKey = [commandKey, "options", optionTemplate.name].join(".");
			const localisations = localiseCommandOrOption(optionKey);
			if (localisations === undefined) {
				continue;
			}

			const option: Option = { ...localisations, ...optionTemplate, options: [] };

			for (const subOptionTemplate of optionTemplate.options ?? []) {
				const subOptionKey = [optionKey, "options", subOptionTemplate.name].join(".");
				const localisations = localiseCommandOrOption(subOptionKey);
				if (localisations === undefined) {
					continue;
				}

				const subOption: Option = { ...localisations, ...subOptionTemplate, options: [] };

				for (const subSubOptionTemplate of subOptionTemplate.options ?? []) {
					const subSubOptionKey = [subOptionKey, "options", subSubOptionTemplate.name].join(".");
					const localisations = localiseCommandOrOption(subSubOptionKey);
					if (localisations === undefined) {
						continue;
					}

					const subSubOption: Option = { ...localisations, ...subSubOptionTemplate, options: [] };

					subOption.options?.push(subSubOption);
				}

				option.options?.push(subOption);
			}

			command.options?.push(option);
		}

		commands.push(command);
	}

	return commands;
}

function createCommandHandlers(commands: CommandTemplate[]): Client["commands"]["handlers"] {
	const handlers = new Map<string, InteractionHandler>();
	const autocompleteHandlers = new Map<string, InteractionHandler>();

	for (const command of commands) {
		if (command.handle !== undefined) {
			handlers.set(command.name, command.isRateLimited ? withRateLimiting(command.handle) : command.handle);
		}

		if (command.handleAutocomplete !== undefined) {
			autocompleteHandlers.set(command.name, command.handleAutocomplete);
		}

		if (command.options === undefined) {
			continue;
		}

		for (const option of command.options) {
			if (option.handle !== undefined) {
				handlers.set(
					`${command.name} ${option.name}`,
					command.isRateLimited || option.isRateLimited ? withRateLimiting(option.handle) : option.handle,
				);
			}

			if (option.handleAutocomplete !== undefined) {
				autocompleteHandlers.set(`${command.name} ${option.name}`, option.handleAutocomplete);
			}

			if (option.options === undefined) {
				continue;
			}

			for (const subOption of option.options) {
				if (subOption.handle !== undefined) {
					handlers.set(
						`${command.name} ${option.name} ${subOption.name}`,
						command.isRateLimited || option.isRateLimited || subOption.isRateLimited
							? withRateLimiting(subOption.handle)
							: subOption.handle,
					);
				}

				if (subOption.handleAutocomplete !== undefined) {
					autocompleteHandlers.set(`${command.name} ${option.name} ${subOption.name}`, subOption.handleAutocomplete);
				}
			}
		}
	}

	return { execute: handlers, autocomplete: autocompleteHandlers };
}

function getImplicitLanguage(guild: Guild): Language {
	const [match, language] = configuration.guilds.namePattern.exec(guild.name) ?? [];
	if (match === undefined) {
		return defaultLanguage;
	}

	if (language === undefined) {
		throw `StateError: '${guild.name}' was matched to the guild name regular expression, but the language part was \`undefined\`.`;
	}

	const found = supportedLanguages.find((supportedLanguage) => supportedLanguage === language);
	if (found !== undefined) {
		return found;
	}

	return defaultLanguage;
}

function registerGuild(client: Client, guild: Guild): void {
	const language = getImplicitLanguage(guild);

	client.cache.guilds.set(guild.id, { ...guild, language });
}

function startServices([client, bot]: [Client, Bot]): void {
	for (const startService of services) {
		startService([client, bot]);
	}
}

function setupLavalinkNode([client, bot]: [Client, Bot]): void {
	client.features.music.node.on("connect", ({ took: tookMs }) =>
		client.log.info(`Connected to Lavalink node. Time taken: ${tookMs} ms`),
	);

	client.features.music.node.on("error", (error) => {
		if (error.name === "ConnectionRefused") {
			return;
		}

		client.log.error(`The Lavalink node has encountered an error:\n${error}`);
	});

	client.features.music.node.on("disconnect", async (error) => {
		if (error.code === -1) {
			client.log.warn("Unable to connect to Lavalink node. Retrying in 5 seconds...");
			await new Promise((resolve) => setTimeout(resolve, 5000));
		} else {
			client.log.info(
				`Disconnected from the Lavalink node. Code ${error.code}, reason: ${error.reason}\nAttempting to reconnect...`,
			);
		}

		connectToLavalinkNode([client, bot]);
	});

	connectToLavalinkNode([client, bot]);
}

function connectToLavalinkNode([client, bot]: [Client, Bot]): void {
	client.log.info("Connecting to Lavalink node...");
	client.features.music.node.connect(bot.id.toString());
}

function addCollector<T extends keyof EventHandlers>(
	[client, bot]: [Client, Bot],
	event: T,
	collector: Collector<T>,
): void {
	const onEnd = collector.onEnd;
	collector.onEnd = () => {
		collectors?.delete(collector);
		onEnd();
	};

	if (collector.limit !== undefined) {
		let emitCount = 0;
		const onCollect = collector.onCollect;
		collector.onCollect = (...args) => {
			emitCount++;

			if (emitCount === collector.limit) {
				collector.onEnd();
			}

			onCollect(...args);
		};
	}

	const { removeAfter } = collector;
	if (removeAfter !== undefined) {
		setTimeout(collector.onEnd, removeAfter);
	}

	if (!client.collectors.has(event)) {
		const collectors: Set<Collector<keyof EventHandlers>> = new Set();
		client.collectors.set(event, collectors);

		extendEventHandler(bot, event, { prepend: true }, (...args) => {
			for (const collector of collectors) {
				if (!collector.filter(...args)) {
					continue;
				}

				collector.onCollect(...args);
			}
		});
	}

	const collectors = client.collectors.get(event);
	if (collectors === undefined) {
		return;
	}

	collectors.add(collector);
}

const snowflakePattern = new RegExp(/^([0-9]{17,20})$/);
const userMentionPattern = new RegExp(/^<@!?([0-9]{17,20})>$/);

function isValidSnowflake(snowflake: string): boolean {
	return snowflakePattern.test(snowflake);
}

function extractIDFromIdentifier(identifier: string): string | undefined {
	return snowflakePattern.exec(identifier)?.at(1) ?? userMentionPattern.exec(identifier)?.at(1);
}

const userTagPattern = new RegExp(/^(.{2,32}#[0-9]{4})$/);

function isValidIdentifier(identifier: string): boolean {
	return snowflakePattern.test(identifier) || userMentionPattern.test(identifier) || userTagPattern.test(identifier);
}

interface MemberNarrowingOptions {
	includeBots: boolean;
	restrictToSelf: boolean;
	restrictToNonSelf: boolean;
	excludeModerators: boolean;
}

function resolveIdentifierToMembers(
	client: Client,
	guildId: bigint,
	userId: bigint,
	identifier: string,
	options: Partial<MemberNarrowingOptions> = {},
): [members: Member[], isResolved: boolean] | undefined {
	const asker = client.cache.members.get(snowflakeToBigint(`${userId}${guildId}`));
	if (asker === undefined) {
		return undefined;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return undefined;
	}

	const moderatorRoleIds = guild.roles
		.array()
		.filter((role) => calculatePermissions(role.permissions).includes("MODERATE_MEMBERS"))
		.map((role) => role.id);
	if (moderatorRoleIds.length === 0) {
		return undefined;
	}

	const id = extractIDFromIdentifier(identifier);
	if (id !== undefined) {
		const member = client.cache.members.get(snowflakeToBigint(`${id}${guildId}`));
		if (member === undefined) {
			return undefined;
		}

		if (options.restrictToSelf && member.id !== asker.id) {
			return undefined;
		}

		if (options.restrictToNonSelf && member.id === asker.id) {
			return undefined;
		}

		if (options.excludeModerators && moderatorRoleIds.some((roleId) => member.roles.includes(roleId))) {
			return undefined;
		}

		return [[member], true];
	}

	const cachedMembers = options.restrictToSelf ? [asker] : guild.members.array();
	const members = cachedMembers.filter(
		(member: Member) =>
			(options.restrictToNonSelf ? member.user?.id !== asker.user?.id : true) &&
			(options.excludeModerators ? !moderatorRoleIds.some((roleId) => member.roles.includes(roleId)) : true),
	);

	if (userTagPattern.test(identifier)) {
		const member = members.find(
			(member) => member.user !== undefined && `${member.user.username}#${member.user.discriminator}` === identifier,
		);
		if (member === undefined) {
			return [[], false];
		}

		return [[member], true];
	}

	const identifierLowercase = identifier.toLowerCase();
	const matchedMembers = members.filter((member) => {
		if (member.user?.toggles.bot && !options.includeBots) {
			return false;
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

async function autocompleteMembers(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	identifier: string,
	options?: Partial<MemberNarrowingOptions>,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return undefined;
	}

	const result = resolveIdentifierToMembers(client, guildId, interaction.user.id, identifier, options);
	if (result === undefined) {
		return;
	}

	const [matchedMembers, _] = result;

	const users: User[] = [];
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

	respond(
		[client, bot],
		interaction,
		users.map((user) => ({ name: diagnosticMentionUser(user), value: user.id.toString() })),
	);
}

function resolveInteractionToMember(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	identifier: string,
	options?: Partial<MemberNarrowingOptions>,
): Member | undefined {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return undefined;
	}

	const result = resolveIdentifierToMembers(client, guildId, interaction.user.id, identifier, options);
	if (result === undefined) {
		return;
	}

	const [matchedMembers, isResolved] = result;
	if (isResolved) {
		return matchedMembers.at(0);
	}

	if (matchedMembers.length === 0) {
		const strings = {
			title: localise(client, "interactions.invalidUser.title", interaction.locale)(),
			description: localise(client, "interactions.invalidUser.description", interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});

		return undefined;
	}

	return matchedMembers.at(0);
}

function extendEventHandler<Event extends keyof EventHandlers, Handler extends EventHandlers[Event]>(
	bot: Bot,
	eventName: Event,
	{ prepend = false, append = false }: { prepend: true; append?: false } | { prepend?: false; append: true },
	extension: (...args: Parameters<Handler>) => unknown,
): void {
	const events = bot.events;

	const handler = events[eventName] as (...args: Parameters<Handler>) => unknown;
	events[eventName] = (
		prepend || !append
			? (...args: Parameters<Handler>) => {
					extension(...args);
					handler(...args);
			  }
			: (...args: Parameters<Handler>) => {
					handler(...args);
					extension(...args);
			  }
	) as Handler;
}

function isSubcommandGroup(option: InteractionDataOption): boolean {
	return option.type === ApplicationCommandOptionTypes.SubCommandGroup;
}

function isSubcommand(option: InteractionDataOption): boolean {
	return option.type === ApplicationCommandOptionTypes.SubCommand;
}

function createLocalisations(localisationsRaw: Map<string, Map<Language, string>>): Client["localisation"] {
	const compilersProvisional: Partial<Record<Language, CompiledLocalisation>> = {};
	for (const [language, transformers] of Object.entries(localisationTransformers)) {
		compilersProvisional[language as Language] = MessagePipe.MessagePipe(transformers).compile;
	}
	const compilers = compilersProvisional as Record<Language, CompiledLocalisation>;

	const localisations = new Map<string, Map<Language, (args: Record<string, unknown>) => string>>();
	for (const [key, languages] of localisationsRaw.entries()) {
		const functions = new Map<Language, (args: Record<string, unknown>) => string>();

		for (const [language, string] of languages.entries()) {
			const compile = compilers[language];
			if (compile === undefined) {
				console.error(`Failed to compile localisation function for string key '${key}' in ${language}.`);
				continue;
			}

			functions.set(language, compile(string));
		}

		localisations.set(key, functions);
	}

	return { compilers, localisations };
}

function localise(client: Client, key: string, locale: string | undefined): (args?: Record<string, unknown>) => string {
	const language = (locale !== undefined ? getLanguageByLocale(locale as Locales) : undefined) ?? defaultLanguage;

	const getLocalisation =
		client.localisation.localisations.get(key)?.get(language) ??
		client.localisation.localisations.get(key)?.get(defaultLanguage) ??
		(() => key);

	return (args) => {
		const string = getLocalisation(args ?? {});
		if (language !== defaultLanguage && string.trim().length === 0) {
			return localise(client, key, undefined)(args ?? {});
		}

		return string;
	};
}

function toDiscordLocalisations(
	localisations: Map<Language, (args: Record<string, unknown>) => string>,
): DiscordLocalisations {
	const entries = Array.from(localisations.entries());
	const result: DiscordLocalisations = {};
	for (const [language, localise] of entries) {
		const locale = getLocaleForLanguage(language);
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

function pluralise(client: Client, key: string, language: Language, number: number): string {
	const compile = client.localisation.compilers[language];
	const pluralised = compile(
		`{number | pluralise, one:"${client.localisation.localisations.get(`${key}.one`)?.get(language)?.({
			one: number,
		})}", two:"${client.localisation.localisations.get(`${key}.two`)?.get(language)?.({
			two: number,
		})}", many:"${client.localisation.localisations.get(`${key}.many`)?.get(language)?.({ many: number })}"}`,
	)({ number });
	return pluralised;
}

function isServicing(client: Client, guildId: bigint): boolean {
	const environment = configuration.guilds.environments[guildId.toString()];
	return environment === client.metadata.environment.environment;
}

export {
	addCollector,
	autocompleteMembers,
	extendEventHandler,
	getImplicitLanguage,
	initialiseClient,
	isServicing,
	isValidIdentifier,
	isValidSnowflake,
	localise,
	resolveIdentifierToMembers,
	resolveInteractionToMember,
	pluralise,
};
export type { Client, Collector, CompiledLocalisation, WithLanguage };
