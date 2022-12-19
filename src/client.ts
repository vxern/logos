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
import { setupLogging } from 'logos/src/controllers/logging/logging.ts';
import { MusicController, setupMusicController } from 'logos/src/controllers/music.ts';
import { getCommands } from 'logos/src/commands/commands.ts';
import { createDatabase, Database } from 'logos/src/database/database.ts';
import services from 'logos/src/services/services.ts';
import { diagnosticMentionUser } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
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
	messages: Map<bigint, Message>;
}>;

function createCache(): Cache {
	return {
		guilds: new Map(),
		users: new Map(),
		members: new Map(),
		channels: new Map(),
		messages: new Map(),
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
		intents: Intents.Guilds | Intents.GuildMembers | Intents.GuildVoiceStates | Intents.GuildMessages,
		events: withMusicEvents(createEventHandlers(client), client.features.music.node),
		transformers: withCaching(client, createTransformers({})),
	}));

	startServices([client, bot]);

	return Promise.all([
		...(Deno.env.get('ENVIRONMENT') === 'development' ? [client.features.music.node.connect(bot.id)] : []),
		startBot(bot),
	]).then(() => [client, bot]);
}

async function prefetchDataFromDatabase(client: Client, database: Database): Promise<void> {
	await Promise.all([
		database.adapters.entryRequests.prefetch(client),
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
		voiceStateUpdate: (_bot, payload) => {
			node.handleVoiceUpdate({
				session_id: payload.sessionId,
				channel_id: payload.channelId !== undefined ? `${payload.channelId}` : null,
				guild_id: `${payload.guildId}`,
				user_id: `${payload.userId}`,
			});
		},
		voiceServerUpdate: (_bot, payload) => {
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
		guildCreate: async (bot, guild) => {
			upsertGuildApplicationCommands(bot, guild.id, client.commands);

			registerGuild(client, guild);

			setupLogging([client, bot], guild);
			setupMusicController(client, guild);

			await fetchMembers(bot, guild.id, { limit: 0, query: '' });
		},
		channelDelete: (_bot, channel) => {
			client.cache.channels.delete(channel.id);
			client.cache.guilds.get(channel.guildId)?.channels.delete(channel.id);
		},
		interactionCreate: (bot, interaction) => {
			if (interaction.data?.customId === 'none') {
				return <unknown> sendInteractionResponse(bot, interaction.id, interaction.token, {
					type: InteractionResponseTypes.DeferredUpdateMessage,
				});
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

		client.cache.messages.set(result.id, result);

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

function createCommandHandlers(
	commands: Command[],
): Map<string, InteractionHandler> {
	const handlers = new Map<string, InteractionHandler>();

	for (const command of commands) {
		if (command.handle !== undefined) {
			handlers.set(command.name, command.handle);
		}

		if (command.options === undefined) continue;

		for (const option of command.options) {
			if (option.handle !== undefined) {
				handlers.set(`${command.name} ${option.name}`, option.handle);
			}

			if (option.options === undefined) continue;

			for (const subOption of option.options) {
				if (subOption.handle !== undefined) {
					handlers.set(`${command.name} ${option.name} ${subOption.name}`, subOption.handle);
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

		const eventHandler = <(...args: Parameters<EventHandlers[T]>) => void> bot
			.events[event];
		bot.events[event] = <EventHandlers[T]> ((...args: Parameters<typeof eventHandler>) => {
			const collectors = <Set<Collector<T>>> client.collectors.get(event)!;

			for (const collector of collectors) {
				if (!collector.filter(...args)) {
					continue;
				}

				collector.onCollect(...args);
			}

			eventHandler(...args);
		});
	}

	const collectors = <Set<Collector<T>>> client.collectors.get(event)!;
	collectors.add(collector);
}

const userMentionExpression = new RegExp(/^<@!?([0-9]{18})>$/);
const userIDExpression = new RegExp(/^[0-9]{18}$/);

/**
 * @param client - The client instance to use.
 * @param guildId - The id of the guild whose members to resolve to.
 * @param identifier - The user identifier to match to members.
 * @param options - Additional options to use when resolving to members.
 *
 * @returns A tuple containing the members matched to the identifier and a
 * boolean value indicating whether the identifier is a user ID.
 */
function resolveIdentifierToMembers(
	client: Client,
	guildId: bigint,
	identifier: string,
	options: { includeBots: boolean } = { includeBots: false },
): [Member[], boolean] | undefined {
	let id: string | undefined = undefined;
	id ??= userMentionExpression.exec(identifier)?.at(1);
	id ??= userIDExpression.exec(identifier)?.at(0);

	if (id === undefined) {
		const members = Array.from(client.cache.members.values()).filter((member) => member.guildId === guildId);

		const identifierLowercase = identifier.toLowerCase();
		return [
			members.filter((member) => {
				if (!options.includeBots && member.user?.toggles.bot) return false;
				if (member.user?.username.toLowerCase().includes(identifierLowercase)) {
					return true;
				}
				if (member.nick?.toLowerCase().includes(identifierLowercase)) {
					return true;
				}
				return false;
			}),
			false,
		];
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) return;

	const member = client.cache.members.get(snowflakeToBigint(`${id}${guild.id}`));
	if (member === undefined) return;

	return [[member], true];
}

function resolveInteractionToMember(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	identifier: string,
): Member | undefined {
	const result = resolveIdentifierToMembers(
		client,
		interaction.guildId!,
		identifier,
	);
	if (result === undefined) return;

	const [matchedMembers, isId] = result;
	if (isId) return matchedMembers.at(0);

	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: {
					choices: matchedMembers.slice(0, 20).map((member) => ({
						name: diagnosticMentionUser(member.user!, true),
						value: member.id.toString(),
					})),
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
						color: configuration.messages.colors.red,
					}],
				},
			},
		);
	}

	return matchedMembers.at(0);
}

export { addCollector, initialiseClient, resolveInteractionToMember };
export type { Client, Collector, WithLanguage };
