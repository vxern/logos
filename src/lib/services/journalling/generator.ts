import { Client } from "../../client.js";
import { GuildEvents } from "./guild-events.js";
import * as Discord from "discordeno";

type Events = ClientEvents & GuildEvents;

type ClientEvents = {
	[T in keyof Discord.EventHandlers]: Parameters<Discord.EventHandlers[T]>;
};

/**
 * Represents a list of supported log message generators for various client
 * and guild events.
 */
type MessageGenerators<E extends ClientEvents | GuildEvents = Events> = Partial<{
	[key in keyof E]: JournalEntryGenerator<E, key>;
}>;

/** Represents an entry in the log channel. */
interface JournalEntryGenerator<E extends Record<string, unknown[]>, K extends keyof E> {
	/** Title of this entry. */
	title: string;

	/** The colour of this entry. */
	color: number;

	/** Content of this entry. */
	message: (client: Client, ...args: E[K]) => Promise<string | undefined> | string | undefined;

	/** A condition that must be met for this entry to be logged. */
	filter: (client: Client, originGuildId: bigint, ...args: E[K]) => boolean;
}

export type { JournalEntryGenerator, Events, MessageGenerators, ClientEvents, GuildEvents };
