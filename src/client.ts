import {
	Bot,
	Channel,
	createBot,
	EventHandlers,
	getUser,
	Guild,
	Intents,
	lavadeno,
	Member,
	Message,
	sendShardMessage,
	startBot,
	upsertApplicationCommands,
	User,
} from '../deps.ts';
import services from './services/service.ts';
import { LoggingController } from './controllers/logging.ts';
import { MusicController } from './controllers/music.ts';
import secrets from '../secrets.ts';
import { Database } from './database/database.ts';
import configuration from './configuration.ts';
import {
	Command,
	CommandBuilder,
	InteractionHandler,
} from './commands/command.ts';
import { defaultLanguage, Language, supportedLanguages } from './types.ts';
import { commandBuilders } from './commands/modules.ts';

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

/** The core of the application, used for interacting with the Discord API. */
class Client {
	readonly bot: Bot;

	readonly collectors: Map<
		keyof EventHandlers,
		Set<Collector<keyof EventHandlers>>
	> = new Map();

	readonly commands: Map<string, InteractionHandler> = new Map();

	readonly guilds: Map<bigint, Guild> = new Map();

	readonly users: Map<bigint, User> = new Map();

	readonly members: Map<bigint, Member> = new Map();

	readonly channels: Map<bigint, Channel> = new Map();

	readonly messages: Map<bigint, Message> = new Map();

	/** Database connection. */
	readonly database: Database = new Database();

	/**
	 * Languages of the guilds managed by this client.
	 *
	 * The keys are guild IDs, and the values are their respective topic language.
	 */
	readonly languages: Map<bigint, Language> = new Map();

	/**
	 * Logging controllers pertaining to the guilds managed by this client.
	 *
	 * The keys are guild IDs, and the values are their respective logging controller.
	 */
	readonly logging: Map<bigint, LoggingController> = new Map();

	/**
	 * Music controllers pertaining to the guilds managed by this client.
	 *
	 * The keys are guild IDs, and the values are their respective music controller.
	 */
	readonly music: Map<bigint, MusicController> = new Map();

	/** The Lavalink node serving this client. */
	node!: lavadeno.Node;

	/** Constructs an instance of {@link Client}. */
	constructor() {
		console.log('Creating bot...');

		this.bot = createBot({
			token: secrets.core.discord.secret,
			intents: Intents.Guilds | Intents.GuildMembers,
			events: {
				ready: (bot) => this.setupBot(bot),
			},
		});

		console.log('Setting up cache...');

		this.setupCache(this.bot);
	}

	start(): void {
		return void startBot(this.bot);
	}

	protected setupCache(bot: Bot): void {
		const { guild, user, member, channel, message, role } = bot.transformers;

		bot.transformers.guild = (bot, payload) => {
			const result = guild(bot, payload);

			this.guilds.set(result.id, result);

			payload.guild.channels?.forEach((channel) => {
				bot.transformers.channel(bot, { channel, guildId: result.id });
			});

			registerCommands(this, result.id, commandBuilders);

			this.setupControllers(result);

			const guildNameMatch =
				configuration.guilds.nameExpression.exec(result.name) || undefined;
			if (!guildNameMatch) return result;

			const languageString = guildNameMatch[1]!.toLowerCase();
			const language = supportedLanguages.find((language) =>
				languageString === language
			);
			if (!language) return result;

			this.languages.set(result.id, language);

			return result;
		};

		bot.transformers.user = (...args) => {
			const result = user(...args);

			this.users.set(result.id, result);

			return result;
		};

		bot.transformers.member = (...args) => {
			const result = member(...args);

			const memberId = `${result.id}${result.guildId}`;
			const memberSnowflake = bot.transformers.snowflake(memberId);

			this.members.set(memberSnowflake, result);

			return result;
		};

		bot.transformers.channel = (...args) => {
			const result = channel(...args);

			this.channels.set(result.id, result);

			return result;
		};

		bot.transformers.message = (bot, payload) => {
			const result = message(bot, payload);

			this.messages.set(result.id, result);

			const user = bot.transformers.user(bot, payload.author);

			this.users.set(user.id, user);

			if (payload.member && payload.guild_id) {
				const guildId = bot.transformers.snowflake(payload.guild_id);

				const member = bot.transformers.member(
					bot,
					payload.member,
					guildId,
					user.id,
				);

				this.members.set(member.id, member);
			}

			return result;
		};

		bot.transformers.role = (bot, payload) => {
			const result = role(bot, payload);

			this.guilds.get(result.guildId)?.roles.set(result.id, result);

			return result;
		};
	}

	/**
	 * Called when {@link Client} is authenticated by Discord, and is ready to use
	 * the API.
	 *
	 * @remarks
	 * This function should __not__ be called externally.
	 */
	protected async setupBot(bot: Bot): Promise<void> {
		console.time('SETUP');

		const onInteractionCreate = bot.events['interactionCreate'];
		bot.events['interactionCreate'] = (bot, interaction) => {
			onInteractionCreate(bot, interaction);

			const commandName = interaction.data?.name;
			if (!commandName) return;

			const handler = this.commands.get(commandName);
			if (!handler) return;

			try {
				handler(this, interaction);
			} catch (exception) {
				console.error(exception);
			}
		};

		this.node = new lavadeno.Node({
			connection: secrets.modules.music.lavalink,
			sendGatewayPayload: (id, payload) => {
				const shardId = this.guilds.get(id)?.shardId;
				if (!shardId) return;

				const shard = bot.gateway.manager.shards.find((shard) =>
					shard.id === shardId
				);
				if (!shard) return;

				sendShardMessage(shard, payload, true);
			},
		});
		await this.node.connect(bot.id);

		bot.events.voiceStateUpdate = (_bot, payload) =>
			this.node.handleVoiceUpdate({
				session_id: payload.sessionId,
				channel_id: payload.channelId ? `${payload.channelId}` : null,
				guild_id: `${payload.guildId}`,
				user_id: `${payload.userId}`,
			});
		bot.events.voiceServerUpdate = (_bot, payload) =>
			this.node.handleVoiceUpdate({
				token: payload.token,
				endpoint: payload.endpoint!,
				guild_id: `${payload.guildId}`,
			});

		this.setupServices();

		console.timeEnd('SETUP');
	}

	setupControllers(guild: Guild): void {
		this.logging.set(guild.id, new LoggingController(this, guild));
		this.music.set(guild.id, new MusicController(this, guild));
	}

	setupServices(): void {
		for (const startService of services) {
			startService(this);
		}
	}
}

function registerCommands(
	client: Client,
	guildId: bigint,
	commandBuilders: CommandBuilder[],
): void {
	const language = client.languages.get(guildId) ?? defaultLanguage;

	const commands: Command[] = [];
	for (const commandBuilder of commandBuilders) {
		const command = typeof commandBuilder === 'function'
			? commandBuilder(language)
			: commandBuilder;

		commands.push(command);
	}

	for (const command of commands) {
		if (command.handle) {
			client.commands.set(command.name, command.handle);
		}

		if (!command.options) {
			continue;
		}

		for (const option of command.options) {
			if (option.handle) {
				client.commands.set(`${command.name} ${option.name}`, option.handle);
			}

			if (!option.options) {
				continue;
			}

			for (const subOption of option.options) {
				if (subOption.handle) {
					client.commands.set(
						`${command.name} ${option.name} ${subOption.name}`,
						subOption.handle,
					);
				}
			}
		}
	}

	upsertApplicationCommands(client.bot, commands, guildId);
}

function addCollector<T extends keyof EventHandlers>(
	client: Client,
	event: T,
	collector: Collector<T>,
): void {
	const onEnd = collector.onEnd;
	collector.onEnd = () => {
		collectors.delete(collector);
		onEnd();
	};

	if (collector.limit) {
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

	if (collector.removeAfter) {
		setTimeout(collector.onEnd, collector.removeAfter!);
	}

	if (!client.collectors.has(event)) {
		client.collectors.set(event, new Set());

		const eventHandler = client.bot.events[event];
		client.bot.events[event] =
			<EventHandlers[T]> ((...args: Parameters<EventHandlers[T]>) => {
				const collectors = <Set<Collector<T>>> client.collectors.get(event)!;

				for (const collector of collectors) {
					if (!collector.filter(...args)) {
						continue;
					}

					collector.onCollect(...args);
				}

				// @ts-ignore: Fuck you, TypeScript.
				eventHandler(...args);
			});
	}

	const collectors = <Set<Collector<T>>> client.collectors.get(event)!;
	collectors.add(collector);
}

/**
 * Checks if the guild is part of the language network.
 *
 * @param client - The client instance to use.
 * @param guildId - The ID of the guild whose status to check.
 * @return The result of the check.
 */
function isManagedGuild(client: Client, guildId: bigint): boolean {
	const guild = client.guilds.get(guildId);
	if (!guild) return false;

	return configuration.guilds.nameExpression.test(guild.name!);
}

/**
 * Returns the topic language of a guild.
 *
 * @param client - The client instance to use.
 * @param guildId - The ID of the guild to get.
 * @returns The guild's language.
 */
function getLanguage(client: Client, guildId: bigint): Language {
	return client.languages.get(guildId) ?? defaultLanguage;
}

/**
 * Returns the bot user.
 *
 * @param client - The client instance to use.
 * @returns A promise resolving to the bot user or undefined.
 */
function getBotUser(client: Client): Promise<User | undefined> {
	const cachedUser = client.users.get(client.bot.id);
	if (cachedUser) return new Promise(() => cachedUser);

	return getUser(client.bot, client.bot.id);
}

export { addCollector, Client, getBotUser, getLanguage, isManagedGuild };
export type { Collector };
