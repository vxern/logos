import { ClientEvents, Guild } from '../../../../deps.ts';
import { GuildEvents } from './generators/guild.ts';

/** Type representing the whole collection of available events. */
type Events = GuildEvents & ClientEvents;

/** Represents an entry in the log channel. */
interface LogEntry<E extends ClientEvents | GuildEvents, K extends keyof E> {
	/** Title of this entry. */
	title: string;

	/** Content of this entry. */
	// @ts-ignore Values of Events are arrays.
	message: (...args: E[K]) => Promise<string> | string | undefined;

	/** A condition that must be met for this entry to be logged. */
	// @ts-ignore Values of Events are arrays.
	filter: (origin: Guild, ...args: E[K]) => boolean;

	/** The colour of this entry. */
	color: number;
}

export type { Events, LogEntry };
