import { GuildEvents } from "./guild-events.js";
import { LogEntry } from "./log-entry.js";
import { EventHandlers } from "discordeno";

type Events = ClientEvents & GuildEvents;

type ClientEvents = {
	[T in keyof EventHandlers]: Parameters<EventHandlers[T]>;
};

/**
 * Represents a list of supported log message generators for various client
 * and guild events.
 */
type MessageGenerators<E extends ClientEvents | GuildEvents = Events> = Partial<{ [key in keyof E]: LogEntry<E, key> }>;

export type { Events, MessageGenerators, ClientEvents, GuildEvents };
