import { Client } from "./client";
import { Collector } from "./collectors";
import { Logger } from "./logger";
import { ServiceStore } from "./services";

type Event = keyof Discord.EventHandlers;
class EventStore {
	readonly #log: Logger;
	readonly #services: ServiceStore;
	readonly #collectors: Map<Event, Set<Collector<Event>>>;

	constructor(client: Client, { services }: { services: ServiceStore }) {
		this.#log = Logger.create({ identifier: "Client/EventStore", isDebug: client.environment.isDebug });
		this.#services = services;
		this.#collectors = new Map();
	}

	buildEventHandlers(): Partial<Discord.EventHandlers> {
		const events = this;

		return {
			ready: (...args) => events.#services.dispatchToGlobal("ready", { args }),
			interactionCreate: (interactionRaw) =>
				events.dispatchEvent(interactionRaw.guildId, "interactionCreate", { args: [interactionRaw] }),
			guildMemberAdd: (member, user) =>
				events.dispatchEvent(member.guildId, "guildMemberAdd", { args: [member, user] }),
			guildMemberRemove: (user, guildId) =>
				events.dispatchEvent(guildId, "guildMemberRemove", { args: [user, guildId] }),
			guildMemberUpdate: (member, user) =>
				events.dispatchEvent(member.guildId, "guildMemberUpdate", { args: [member, user] }),
			messageCreate: (message) => events.dispatchEvent(message.guildId, "messageCreate", { args: [message] }),
			messageDelete: (payload, message) =>
				events.dispatchEvent(payload.guildId, "messageDelete", { args: [payload, message] }),
			messageDeleteBulk: (payload) => events.dispatchEvent(payload.guildId, "messageDeleteBulk", { args: [payload] }),
			messageUpdate: (message, oldMessage) =>
				events.dispatchEvent(message.guildId, "messageUpdate", { args: [message, oldMessage] }),
			voiceServerUpdate: (payload) => events.dispatchEvent(payload.guildId, "voiceServerUpdate", { args: [payload] }),
			voiceStateUpdate: (voiceState) =>
				events.dispatchEvent(voiceState.guildId, "voiceStateUpdate", { args: [voiceState] }),
			channelCreate: (channel) => events.dispatchEvent(channel.guildId, "channelCreate", { args: [channel] }),
			channelDelete: (channel) => events.dispatchEvent(channel.guildId, "channelDelete", { args: [channel] }),
			channelPinsUpdate: (data) => events.dispatchEvent(data.guildId, "channelPinsUpdate", { args: [data] }),
			channelUpdate: (channel) => events.dispatchEvent(channel.guildId, "channelUpdate", { args: [channel] }),
			guildEmojisUpdate: (payload) => events.dispatchEvent(payload.guildId, "guildEmojisUpdate", { args: [payload] }),
			guildBanAdd: (user, guildId) => events.dispatchEvent(guildId, "guildBanAdd", { args: [user, guildId] }),
			guildBanRemove: (user, guildId) => events.dispatchEvent(guildId, "guildBanRemove", { args: [user, guildId] }),
			guildCreate: (guild) => events.dispatchEvent(guild.id, "guildCreate", { args: [guild] }),
			guildDelete: (id, shardId) => events.dispatchEvent(id, "guildDelete", { args: [id, shardId] }),
			guildUpdate: (guild) => events.dispatchEvent(guild.id, "guildUpdate", { args: [guild] }),
			roleCreate: (role) => events.dispatchEvent(role.guildId, "roleCreate", { args: [role] }),
			roleDelete: (role) => events.dispatchEvent(role.guildId, "roleDelete", { args: [role] }),
			roleUpdate: (role) => events.dispatchEvent(role.guildId, "roleUpdate", { args: [role] }),
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
