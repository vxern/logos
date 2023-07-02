import { GuildEvents } from "./guild-events.js";
import { LogEntry } from "./log-entry.js";
import * as Discord from "discordeno";

type Events = ClientEvents & GuildEvents;

type ClientEvents = {
	[T in keyof Discord.EventHandlers]: Parameters<Discord.EventHandlers[T]>;
};

/**
 * Represents a list of supported log message generators for various client
 * and guild events.
 */
type MessageGenerators<E extends ClientEvents | GuildEvents = Events> = Partial<{ [key in keyof E]: LogEntry<E, key> }>;

export type { Events, MessageGenerators, ClientEvents, GuildEvents };
