import type pino from "pino";

class CacheStore {
	readonly log: pino.Logger;
	readonly entities: {
		readonly guilds: Map<bigint, Logos.Guild>;
		readonly users: Map<bigint, Logos.User>;
		readonly members: Map</* guildId: */ bigint, Map</* userId: */ bigint, Logos.Member>>;
		readonly channels: Map<bigint, Logos.Channel>;
		readonly messages: {
			readonly latest: Map<bigint, Logos.Message>;
			readonly previous: Map<bigint, Logos.Message>;
		};
		readonly attachments: Map<bigint, Logos.Attachment>;
		readonly roles: Map<bigint, Logos.Role>;
	};

	readonly #fetchRequests: Set<bigint>;

	constructor({ log }: { log: pino.Logger }) {
		this.log = log.child({ name: "CacheStore" });
		this.entities = {
			guilds: new Map(),
			users: new Map(),
			members: new Map(),
			channels: new Map(),
			messages: {
				latest: new Map(),
				previous: new Map(),
			},
			attachments: new Map(),
			roles: new Map(),
		};

		this.#fetchRequests = new Set();
	}

	buildCacheHandlers(): Partial<Discord.Transformers["customizers"]> {
		return {
			guild: this.#cacheEntity(this.#cacheGuild.bind(this)),
			channel: this.#cacheEntity(this.#cacheChannel.bind(this)),
			user: this.#cacheEntity(this.#cacheUser.bind(this)),
			member: this.#cacheEntity(this.#cacheMember.bind(this)),
			message: this.#cacheEntity(this.#cacheMessage.bind(this)),
			attachment: this.#cacheEntity(this.#cacheAttachment.bind(this)),
			role: this.#cacheEntity(this.#cacheRole.bind(this)),
			voiceState: this.#cacheEntity(this.#cacheVoiceState.bind(this)),
		};
	}

	#cacheEntity<T>(
		callback: (entity: T) => void | Promise<void>,
	): (bot: Discord.Bot, payload: unknown, entity: T) => T {
		return (_, __, entity) => {
			callback(entity);
			return entity;
		};
	}

	#cacheGuild(guild: Discord.Guild): void {
		this.entities.guilds.set(guild.id, guild as unknown as Logos.Guild);

		for (const channel of guild.channels.array()) {
			this.#cacheChannel(channel);
		}
	}

	#cacheChannel(channel: Discord.Channel): void {
		this.entities.channels.set(channel.id, channel);

		if (channel.guildId !== undefined) {
			this.entities.guilds.get(channel.guildId)?.channels?.set(channel.id, channel);
		}
	}

	#cacheUser(user: Discord.User): void {
		this.entities.users.set(user.id, user);
	}

	#cacheMember(member: Discord.Member): void {
		if (this.entities.members.has(member.guildId)) {
			this.entities.members.get(member.guildId)!.set(member.id, member);
		} else {
			this.entities.members.set(member.guildId, new Map([[member.id, member]]));
		}

		this.entities.guilds.get(member.guildId)?.members?.set(member.id, member);
	}

	#cacheMessage(message: Discord.Message): void {
		const previousMessage = this.entities.messages.latest.get(message.id);
		if (previousMessage !== undefined) {
			this.entities.messages.previous.set(message.id, previousMessage);
		}

		this.entities.messages.latest.set(message.id, message);
	}

	async #cacheAttachment(attachment: Discord.Attachment): Promise<void> {
		if (this.entities.attachments.has(attachment.id) || this.#fetchRequests.has(attachment.id)) {
			return;
		}

		this.#fetchRequests.add(attachment.id);

		const blob = await fetch(attachment.url).then((response) => response.blob());

		this.entities.attachments.set(attachment.id, Object.assign(attachment, { blob }));

		this.#fetchRequests.delete(attachment.id);
	}

	#cacheRole(role: Discord.Role): void {
		this.entities.roles.set(role.id, role);

		this.entities.guilds.get(role.guildId)?.roles?.set(role.id, role);
	}

	#cacheVoiceState(voiceState: Discord.VoiceState): void {
		if (voiceState.channelId !== undefined) {
			this.entities.guilds.get(voiceState.guildId)?.voiceStates?.set(voiceState.userId, voiceState);
		} else {
			this.entities.guilds.get(voiceState.guildId)?.voiceStates?.delete(voiceState.userId);
		}
	}
}

export { CacheStore };
