import { Client } from "logos/client";
import { Collector } from "logos/collectors";
import { Logger } from "logos/logger";

type Event = keyof Discord.EventHandlers;
class EventStore {
	readonly #log: Logger;
	readonly #collectors: Map<Event, Set<Collector<Event>>>;

	constructor(client: Client) {
		this.#log = Logger.create({ identifier: "Client/EventStore", isDebug: client.environment.isDebug });
		this.#collectors = new Map();
	}

	buildEventHandlers(): Partial<Discord.EventHandlers> {
		return {
			raw: (payload, shardId) => this.dispatchEvent(undefined, "raw", { args: [payload, shardId] }),
			ready: (payload, rawPayload) => this.dispatchEvent(undefined, "ready", { args: [payload, rawPayload] }),
			interactionCreate: (interactionRaw) =>
				this.dispatchEvent(interactionRaw.guildId, "interactionCreate", { args: [interactionRaw] }),
			guildMemberAdd: (member, user) => this.dispatchEvent(member.guildId, "guildMemberAdd", { args: [member, user] }),
			guildMemberRemove: (user, guildId) => this.dispatchEvent(guildId, "guildMemberRemove", { args: [user, guildId] }),
			guildMemberUpdate: (member, user) =>
				this.dispatchEvent(member.guildId, "guildMemberUpdate", { args: [member, user] }),
			messageCreate: (message) => this.dispatchEvent(message.guildId, "messageCreate", { args: [message] }),
			messageDelete: (payload, message) =>
				this.dispatchEvent(payload.guildId, "messageDelete", { args: [payload, message] }),
			messageDeleteBulk: (payload) => this.dispatchEvent(payload.guildId, "messageDeleteBulk", { args: [payload] }),
			messageUpdate: (message, oldMessage) =>
				this.dispatchEvent(message.guildId, "messageUpdate", { args: [message, oldMessage] }),
			voiceServerUpdate: (payload) => this.dispatchEvent(payload.guildId, "voiceServerUpdate", { args: [payload] }),
			voiceStateUpdate: (voiceState) =>
				this.dispatchEvent(voiceState.guildId, "voiceStateUpdate", { args: [voiceState] }),
			channelCreate: (channel) => this.dispatchEvent(channel.guildId, "channelCreate", { args: [channel] }),
			channelDelete: (channel) => this.dispatchEvent(channel.guildId, "channelDelete", { args: [channel] }),
			channelPinsUpdate: (data) => this.dispatchEvent(data.guildId, "channelPinsUpdate", { args: [data] }),
			channelUpdate: (channel) => this.dispatchEvent(channel.guildId, "channelUpdate", { args: [channel] }),
			guildEmojisUpdate: (payload) => this.dispatchEvent(payload.guildId, "guildEmojisUpdate", { args: [payload] }),
			guildBanAdd: (user, guildId) => this.dispatchEvent(guildId, "guildBanAdd", { args: [user, guildId] }),
			guildBanRemove: (user, guildId) => this.dispatchEvent(guildId, "guildBanRemove", { args: [user, guildId] }),
			guildCreate: (guild) => this.dispatchEvent(guild.id, "guildCreate", { args: [guild] }),
			guildDelete: (id, shardId) => this.dispatchEvent(id, "guildDelete", { args: [id, shardId] }),
			guildUpdate: (guild) => this.dispatchEvent(guild.id, "guildUpdate", { args: [guild] }),
			roleCreate: (role) => this.dispatchEvent(role.guildId, "roleCreate", { args: [role] }),
			roleDelete: (role) => this.dispatchEvent(role.guildId, "roleDelete", { args: [role] }),
			roleUpdate: (role) => this.dispatchEvent(role.guildId, "roleUpdate", { args: [role] }),
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
				if (collector.guildId !== undefined && collector.guildId !== guildId) {
					continue;
				}

				if (collector.filter !== undefined && !collector.filter(...args)) {
					continue;
				}

				// unawaited
				collector.dispatchCollect?.(...args);
			}
		}
	}

	#registerCollector(event: Event, collector: Collector<Event>): void {
		this.#log.debug(`Registering collector for '${event}'...`);

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

export { EventStore };
