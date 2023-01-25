import {
	ActivityTypes,
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Channel,
	createBot,
	createTransformers,
	DiscordMessage,
	editShardStatus,
	EventHandlers,
	fetchMembers,
	Guild,
	Intents,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	Member,
	Message,
	send as sendShardPayload,
	sendInteractionResponse,
	snowflakeToBigint,
	startBot,
	Transformers,
	upsertGuildApplicationCommands,
	User,
} from 'discordeno';
import * as Sentry from 'sentry';
import { Log as Logger } from 'tl_log';
import { Node as LavalinkNode, SendGatewayPayload } from 'lavadeno';
import { localise, Misc } from 'logos/assets/localisations/mod.ts';
import { DictionaryAdapter, SentencePair } from 'logos/src/commands/language/data/types.ts';
import { SupportedLanguage } from 'logos/src/commands/language/module.ts';
import { Command, InteractionHandler } from 'logos/src/commands/command.ts';
import { getCommands } from 'logos/src/commands/commands.ts';
import { setupLogging } from 'logos/src/controllers/logging/logging.ts';
import { MusicController, setupMusicController } from 'logos/src/controllers/music.ts';
import { createDatabase, Database } from 'logos/src/database/database.ts';
import services from 'logos/src/services/services.ts';
import { diagnosticMentionUser } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { timestamp } from 'logos/formatting.ts';
import { defaultLanguage, Language, supportedLanguages } from 'logos/types.ts';

interface Collector<
	E extends keyof EventHandlers,
	P extends unknown[] = Parameters<EventHandlers[E]>,
> {
	filter: (...args: P) => boolean;
	limit?: number;
	removeAfter?: number;
	onCollect: (...args: P) => void;
	onEnd: () => void;
}

type Event = keyof EventHandlers;

type WithLanguage<T> = T & {
	language: Language;
};

type Cache = Readonly<{
	guilds: Map<bigint, WithLanguage<Guild>>;
	users: Map<bigint, User>;
	members: Map<bigint, Member>;
	channels: Map<bigint, Channel>;
	messages: {
		latest: Map<bigint, Message>;
		previous: Map<bigint, Message>;
	};
}>;

function createCache(): Cache {
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

type Client = Readonly<{
	metadata: {
		version: string;
		supportedTranslationLanguages: SupportedLanguage[];
	};
	log: Logger;
	cache: Cache;
	database: Database;
	commands: Command[];
	collectors: Map<Event, Set<Collector<Event>>>;
	handlers: Map<string, InteractionHandler>;
	features: {
		dictionaryAdapters: Map<Language, DictionaryAdapter<unknown>[]>;
		sentencePairs: Map<Language, SentencePair[]>;
		music: {
			node: LavalinkNode;
			controllers: Map<bigint, MusicController>;
		};
		// The keys are user IDs, the values are command usage timestamps mapped by command IDs.
		rateLimiting: Map<bigint, Map<bigint, number[]>>;
	};
}>;

function createClient(metadata: Client['metadata'], features: Client['features']): Client {
	const commands = getCommands();

	return {
		metadata,
		log: createLogger(),
		cache: createCache(),
		database: createDatabase(),
		commands,
		collectors: new Map(),
		handlers: createCommandHandlers(commands),
		features,
	};
}

async function initialiseClient(
	metadata: Client['metadata'],
	features: Omit<Client['features'], 'music'>,
): Promise<[Client, Bot]> {
	const musicFeature = createMusicFeature(
		(guildId, payload) => {
			const shardId = client.cache.guilds.get(guildId)?.shardId;
			if (shardId === undefined) return;

			const shard = bot.gateway.manager.shards.find((shard) => shard.id === shardId);
			if (shard === undefined) return;

			return void sendShardPayload(shard, payload, true);
		},
	);

	const client = createClient(metadata, { ...features, music: musicFeature });

	await prefetchDataFromDatabase(client, client.database);

	const bot = overrideDefaultEventHandlers(createBot({
		token: Deno.env.get('DISCORD_SECRET')!,
		intents: Intents.Guilds |
			Intents.GuildMembers |
			Intents.GuildBans |
			Intents.GuildVoiceStates |
			Intents.GuildMessages |
			Intents.MessageContent,
		events: withMusicEvents(createEventHandlers(client), client.features.music.node),
		transformers: withCaching(client, createTransformers({})),
	}));

	startServices([client, bot]);

	return Promise.all([
		setupLavalinkNode([client, bot]),
		startBot(bot),
	]).then(() => [client, bot]);
}

async function prefetchDataFromDatabase(client: Client, database: Database): Promise<void> {
	await Promise.all([
		database.adapters.entryRequests.prefetch(client),
		database.adapters.reports.prefetch(client),
		database.adapters.suggestions.prefetch(client),
	]);
}

function createLogger(): Logger {
	return new Logger({
		minLogLevel: Deno.env.get('ENVIRONMENT') === 'development' ? 'debug' : 'info',
		levelIndicator: 'full',
	});
}

function createMusicFeature(sendGatewayPayload: SendGatewayPayload): Client['features']['music'] {
	const node = new LavalinkNode({
		connection: {
			host: Deno.env.get('LAVALINK_HOST')!,
			port: Number(Deno.env.get('LAVALINK_PORT')!),
			password: Deno.env.get('LAVALINK_PASSWORD')!,
			secure: true,
		},
		sendGatewayPayload,
	});

	return {
		node,
		controllers: new Map(),
	};
}

function withMusicEvents(events: Partial<EventHandlers>, node: LavalinkNode): Partial<EventHandlers> {
	return {
		...events,
		voiceStateUpdate: (_, payload) => {
			node.handleVoiceUpdate({
				session_id: payload.sessionId,
				channel_id: payload.channelId !== undefined ? `${payload.channelId}` : null,
				guild_id: `${payload.guildId}`,
				user_id: `${payload.userId}`,
			});
		},
		voiceServerUpdate: (_, payload) => {
			node.handleVoiceUpdate({
				token: payload.token,
				endpoint: payload.endpoint!,
				guild_id: `${payload.guildId}`,
			});
		},
	};
}

function overrideDefaultEventHandlers(bot: Bot): Bot {
	bot.handlers.MESSAGE_UPDATE = (bot, data) => {
		const messageData = data.d as DiscordMessage;
		if (!('author' in messageData)) return;

		bot.events.messageUpdate(bot, bot.transformers.message(bot, messageData));
	};

	return bot;
}

function createEventHandlers(client: Client): Partial<EventHandlers> {
	return {
		ready: (bot, payload) =>
			editShardStatus(bot, payload.shardId, {
				activities: [{
					name: client.metadata.version,
					type: ActivityTypes.Streaming,
					createdAt: Date.now(),
				}],
				status: 'online',
			}),
		guildCreate: (bot, guild) => {
			upsertGuildApplicationCommands(bot, guild.id, client.commands);

			registerGuild(client, guild);

			setupLogging([client, bot], guild);
			setupMusicController(client, guild.id);

			fetchMembers(bot, guild.id, { limit: 0, query: '' });
		},
		channelDelete: (_, channel) => {
			client.cache.channels.delete(channel.id);
			client.cache.guilds.get(channel.guildId)?.channels.delete(channel.id);
		},
		interactionCreate: (bot, interaction) => {
			if (interaction.data?.customId === 'none') {
				sendInteractionResponse(bot, interaction.id, interaction.token, {
					type: InteractionResponseTypes.DeferredUpdateMessage,
				});
				return;
			}

			const commandName = interaction.data?.name;
			if (commandName === undefined) return;

			const subCommandGroupOption = interaction.data?.options?.find((option) =>
				option.type === ApplicationCommandOptionTypes.SubCommandGroup
			);

			let commandNameFull: string;
			if (subCommandGroupOption !== undefined) {
				const subCommandGroupName = subCommandGroupOption.name;
				const subCommandName = subCommandGroupOption.options?.find(
					(option) => option.type === ApplicationCommandOptionTypes.SubCommand,
				)?.name;
				if (subCommandName === undefined) return;

				commandNameFull = `${commandName} ${subCommandGroupName} ${subCommandName}`;
			} else {
				const subCommandName = interaction.data?.options?.find((option) =>
					option.type === ApplicationCommandOptionTypes.SubCommand
				)?.name;
				if (subCommandName === undefined) {
					commandNameFull = commandName;
				} else {
					commandNameFull = `${commandName} ${subCommandName}`;
				}
			}

			const handle = client.handlers.get(commandNameFull);
			if (handle === undefined) return;

			Promise.resolve(handle([client, bot], interaction)).catch((exception) => {
				Sentry.captureException(exception);
				client.log.error(exception);
			});
		},
	};
}

function withCaching(
	client: Client,
	transformers: Transformers,
): Transformers {
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

			const member = bot.transformers.member(bot, payload.member, guildId, user.id);

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
	return ([client, bot], interaction) => {
		if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) return handle([client, bot], interaction);

		const commandId = interaction.data?.id;
		if (commandId === undefined) return handle([client, bot], interaction);

		if (!client.features.rateLimiting.has(interaction.user.id)) {
			client.features.rateLimiting.set(interaction.user.id, new Map());
		}

		const executedAt = Date.now();

		const timestampsByCommandId = client.features.rateLimiting.get(interaction.user.id)!;
		const timestamps = [...(timestampsByCommandId.get(commandId) ?? []), executedAt];
		const activeTimestamps = timestamps.filter(
			(timestamp) => (Date.now() - timestamp) <= configuration.rateLimiting.within,
		);

		if (activeTimestamps.length > configuration.rateLimiting.limit) {
			const firstTimestamp = activeTimestamps[0]!;
			const now = Date.now();
			const nextValidUsageTimestamp = timestamp(now + configuration.rateLimiting.within - (now - firstTimestamp));

			return void sendInteractionResponse(bot, interaction.id, interaction.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Misc.usedCommandTooManyTimes, interaction.locale)(nextValidUsageTimestamp),
						color: constants.colors.dullYellow,
					}],
				},
			});
		}

		timestampsByCommandId.set(commandId, activeTimestamps);

		return handle([client, bot], interaction);
	};
}

function createCommandHandlers(
	commands: Command[],
): Map<string, InteractionHandler> {
	const handlers = new Map<string, InteractionHandler>();

	for (const command of commands) {
		if (command.handle !== undefined) {
			handlers.set(command.name, command.isRateLimited ? withRateLimiting(command.handle) : command.handle);
		}

		if (command.options === undefined) continue;

		for (const option of command.options) {
			if (option.handle !== undefined) {
				handlers.set(
					`${command.name} ${option.name}`,
					command.isRateLimited || option.isRateLimited ? withRateLimiting(option.handle) : option.handle,
				);
			}

			if (option.options === undefined) continue;

			for (const subOption of option.options) {
				if (subOption.handle !== undefined) {
					handlers.set(
						`${command.name} ${option.name} ${subOption.name}`,
						command.isRateLimited || option.isRateLimited || subOption.isRateLimited
							? withRateLimiting(subOption.handle)
							: subOption.handle,
					);
				}
			}
		}
	}

	return handlers;
}

function getLanguage(guildName: string): Language {
	const guildNameMatch = configuration.guilds.namePattern.exec(guildName) ?? undefined;
	if (guildNameMatch === undefined) return defaultLanguage;

	const languageString = guildNameMatch.at(1)!;

	return supportedLanguages.find((language) => languageString === language) ??
		defaultLanguage;
}

function registerGuild(client: Client, guild: Guild): void {
	const language = getLanguage(guild.name);

	client.cache.guilds.set(guild.id, { ...guild, language });
}

function startServices([client, bot]: [Client, Bot]): void {
	for (const startService of services) {
		startService([client, bot]);
	}
}

function setupLavalinkNode([client, bot]: [Client, Bot]): Promise<void> {
	client.features.music.node.on(
		'connect',
		(took) => client.log.info(`Connection with the Lavalink node has been established. Time taken: ${took}ms`),
	);
	client.features.music.node.on(
		'error',
		(error) => client.log.error(`The Lavalink node has encountered an error:\n${error}`),
	);
	client.features.music.node.on(
		'disconnect',
		(code, reason) => {
			client.log.info(
				`Disconnected from the Lavalink node. Code ${code}, reason: ${reason}\n` +
					'Attempting to reconnect...',
			);
			return void connectToLavalinkNode([client, bot]);
		},
	);
	return connectToLavalinkNode([client, bot]);
}

function connectToLavalinkNode([client, bot]: [Client, Bot]): Promise<void> {
	client.log.info('Connecting to the Lavalink node...');
	return client.features.music.node.connect(bot.id);
}

function addCollector<T extends keyof EventHandlers>(
	[client, bot]: [Client, Bot],
	event: T,
	collector: Collector<T>,
): void {
	const onEnd = collector.onEnd;
	collector.onEnd = () => {
		collectors.delete(collector);
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

	if (collector.removeAfter !== undefined) {
		setTimeout(collector.onEnd, collector.removeAfter!);
	}

	if (!client.collectors.has(event)) {
		client.collectors.set(event, new Set());

		extendEventHandler(bot, event, { prepend: true }, (...args) => {
			const collectors = client.collectors.get(event)!;

			for (const collector of collectors) {
				if (!collector.filter(...args)) {
					continue;
				}

				collector.onCollect(...args);
			}
		});
	}

	const collectors = client.collectors.get(event)! as Set<Collector<T>>;
	collectors.add(collector);
}

const userIDPattern = new RegExp(/^([0-9]{17,20})$/);
const userMentionPattern = new RegExp(/^<@!?([0-9]{17,20})>$/);

function extractIDFromIdentifier(identifier: string): string | undefined {
	return userIDPattern.exec(identifier)?.at(1) ?? userMentionPattern.exec(identifier)?.at(1);
}

const userTagPattern = new RegExp(/^(.{2,32}#[0-9]{4})$/);

function isValidIdentifier(identifier: string): boolean {
	return userIDPattern.test(identifier) || userMentionPattern.test(identifier) || userTagPattern.test(identifier);
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
	if (asker === undefined) return undefined;

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) return undefined;

	const moderatorRoleId = guild.roles.array().find((role) => role.name === configuration.permissions.moderatorRoleName)
		?.id;
	if (moderatorRoleId === undefined) return undefined;

	const id = extractIDFromIdentifier(identifier);
	if (id !== undefined) {
		const member = client.cache.members.get(snowflakeToBigint(`${id}${guildId}`));
		if (member === undefined) return undefined;
		if (options.restrictToSelf && member.id !== asker.id) return undefined;
		if (options.restrictToNonSelf && member.id === asker.id) return undefined;
		if (options.excludeModerators && member.roles.includes(moderatorRoleId)) {
			return undefined;
		}

		return [[member], true];
	}

	const cachedMembers = options.restrictToSelf ? [asker] : guild.members.array();
	const members = cachedMembers.filter((member: Member) =>
		(!options.restrictToNonSelf ? true : member.user?.id !== asker.user?.id) &&
		(!options.excludeModerators ? true : !member.roles.includes(moderatorRoleId))
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
		if (member.user?.toggles.bot && !options.includeBots) return false;
		if (member.user?.username.toLowerCase().includes(identifierLowercase)) return true;
		if (member.nick?.toLowerCase().includes(identifierLowercase)) return true;
		return false;
	});

	return [matchedMembers, false];
}

function resolveInteractionToMember(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	identifier: string,
	options?: Partial<MemberNarrowingOptions>,
): Member | undefined {
	const result = resolveIdentifierToMembers(client, interaction.guildId!, interaction.user.id, identifier, options);
	if (result === undefined) return;

	const [matchedMembers, isResolved] = result;
	if (isResolved) return matchedMembers.at(0);

	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: {
					choices: matchedMembers.slice(0, 20)
						.map(
							(member) => ({
								name: diagnosticMentionUser(member.user!, true),
								value: member.id.toString(),
							}),
						),
				},
			},
		);
	}

	if (matchedMembers.length === 0) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Misc.client.invalidUser, interaction.locale),
						color: constants.colors.red,
					}],
				},
			},
		);
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
		(prepend || !append)
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

export {
	addCollector,
	extendEventHandler,
	initialiseClient,
	isValidIdentifier,
	resolveIdentifierToMembers,
	resolveInteractionToMember,
};
export type { Client, Collector, WithLanguage };
