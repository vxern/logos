import type { Environment } from "logos:core/loaders/environment";
import type { Collector } from "logos/collectors";
import { Logger } from "logos/logger";

type Event = keyof Discord.EventHandlers;
class EventStore {
	readonly log: Logger;

	readonly #collectors: Map<Event, Set<Collector<Event>>>;

	constructor({ environment }: { environment: Environment }) {
		this.log = Logger.create({ identifier: "Client/EventStore", isDebug: environment.isDebug });

		this.#collectors = new Map();
	}

	buildEventHandlers(): Partial<Discord.EventHandlers> {
		return {
			// * Raw events are not collected - Plug into specific events instead.
			ready: (payload, rawPayload) => this.collectEvent(undefined, "ready", { args: [payload, rawPayload] }),
			interactionCreate: (interactionRaw) =>
				this.collectEvent(interactionRaw.guildId, "interactionCreate", { args: [interactionRaw] }),
			guildMemberAdd: (member, user) =>
				this.collectEvent(member.guildId, "guildMemberAdd", { args: [member, user] }),
			guildMemberRemove: (user, guildId) =>
				this.collectEvent(guildId, "guildMemberRemove", { args: [user, guildId] }),
			guildMemberUpdate: (member, user) =>
				this.collectEvent(member.guildId, "guildMemberUpdate", { args: [member, user] }),
			messageCreate: (message) => this.collectEvent(message.guildId, "messageCreate", { args: [message] }),
			messageDelete: (payload, message) =>
				this.collectEvent(payload.guildId, "messageDelete", { args: [payload, message] }),
			messageDeleteBulk: (payload) =>
				this.collectEvent(payload.guildId, "messageDeleteBulk", { args: [payload] }),
			messageUpdate: (message, oldMessage) =>
				this.collectEvent(message.guildId, "messageUpdate", { args: [message, oldMessage] }),
			voiceServerUpdate: (payload) =>
				this.collectEvent(payload.guildId, "voiceServerUpdate", { args: [payload] }),
			voiceStateUpdate: (voiceState) =>
				this.collectEvent(voiceState.guildId, "voiceStateUpdate", { args: [voiceState] }),
			channelCreate: (channel) => this.collectEvent(channel.guildId, "channelCreate", { args: [channel] }),
			channelDelete: (channel) => this.collectEvent(channel.guildId, "channelDelete", { args: [channel] }),
			channelPinsUpdate: (data) => this.collectEvent(data.guildId, "channelPinsUpdate", { args: [data] }),
			channelUpdate: (channel) => this.collectEvent(channel.guildId, "channelUpdate", { args: [channel] }),
			guildEmojisUpdate: (payload) =>
				this.collectEvent(payload.guildId, "guildEmojisUpdate", { args: [payload] }),
			guildBanAdd: (user, guildId) => this.collectEvent(guildId, "guildBanAdd", { args: [user, guildId] }),
			guildBanRemove: (user, guildId) => this.collectEvent(guildId, "guildBanRemove", { args: [user, guildId] }),
			guildCreate: (guild) => this.collectEvent(guild.id, "guildCreate", { args: [guild] }),
			guildDelete: (id, shardId) => this.collectEvent(id, "guildDelete", { args: [id, shardId] }),
			guildUpdate: (guild) => this.collectEvent(guild.id, "guildUpdate", { args: [guild] }),
			roleCreate: (role) => this.collectEvent(role.guildId, "roleCreate", { args: [role] }),
			roleDelete: (role) => this.collectEvent(role.guildId, "roleDelete", { args: [role] }),
			roleUpdate: (role) => this.collectEvent(role.guildId, "roleUpdate", { args: [role] }),
		};
	}

	collectEvent<Event extends keyof Discord.EventHandlers>(
		guildId: bigint | undefined,
		event: Event,
		{ args }: { args: Parameters<Discord.EventHandlers[Event]> },
	): void {
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
		this.log.debug(`Registering collector for '${event}'...`);

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
