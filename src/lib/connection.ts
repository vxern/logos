import { Client } from "logos/client";
import { Logger } from "logos/logger";

class DiscordConnection {
	readonly bot: Discord.Bot;
	readonly cache: {
		readonly guilds: Map<bigint, Logos.Guild>;
		readonly users: Map<bigint, Logos.User>;
		readonly members: Map</* guildId: */ bigint, Map</* userId: */ bigint, Logos.Member>>;
		readonly channels: Map<bigint, Logos.Channel>;
		readonly messages: {
			readonly latest: Map<bigint, Logos.Message>;
			readonly previous: Map<bigint, Logos.Message>;
		};
		readonly roles: Map<bigint, Logos.Role>;
	};

	readonly #log: Logger;

	constructor(client: Client, { bot, events }: { bot: Discord.Bot; events: Partial<Discord.EventHandlers> }) {
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
			roles: new Map(),
		};

		this.#log = Logger.create({ identifier: "Client/DiscordConnection", isDebug: client.environment.isDebug });

		// REMINDER(vxern): This is a fix for the Discordeno MESSAGE_UPDATE handler filtering out cases where an embed was removed from a message.
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

		// REMINDER(vxern): Move this to `createBot()` once it's supported.
		transformers.desiredProperties = constants.properties as unknown as Discord.Transformers["desiredProperties"];

		return transformers;
	}

	#transformGuild(_: Discord.Bot, payload: Parameters<Discord.Transformers["guild"]>[1]): Discord.Guild {
		const result = Discord.transformGuild(this.bot, payload);

		// REMINDER(vxern): Fix for Discordeno filtering out shard IDs equal to 0.
		result.shardId = payload.shardId;

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

		const guildIdBigInt = BigInt(guildId);
		if (this.cache.members.has(guildIdBigInt)) {
			this.cache.members.get(guildIdBigInt)!.set(BigInt(userId), result);
		} else {
			this.cache.members.set(guildIdBigInt, new Map([[BigInt(userId), result]]));
		}

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

			const guildIdBigInt = BigInt(member.guildId);
			if (this.cache.members.has(guildIdBigInt)) {
				this.cache.members.get(guildIdBigInt)!.set(BigInt(member.id), member);
			} else {
				this.cache.members.set(guildIdBigInt, new Map([[BigInt(member.id), member]]));
			}
		}

		return result;
	}

	#transformRole(_: Discord.Bot, payload: Parameters<Discord.Transformers["role"]>[1]): Discord.Role {
		const result = Discord.transformRole(this.bot, payload);

		this.cache.roles.set(result.id, result);
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

export { DiscordConnection };
