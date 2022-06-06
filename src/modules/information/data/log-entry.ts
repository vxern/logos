import { ClientEvents, Guild } from '../../../../deps.ts';
import { GuildEvents } from './generators/guild.ts';

/** Type representing the whole collection of available events. */
type Events = GuildEvents & ClientEvents;

/** Represents an entry in the log channel. */
interface LogEntry<T extends keyof Events> {
	/** Title of this entry. */
	title: string;

	/** Content of this entry. */
	message: (...args: Events[T]) => Promise<string> | string | undefined;

	/** A condition that must be met for this entry to be logged. */
	filter: (origin: Guild, ...args: Events[T]) => boolean;

	/** The colour of this entry. */
	color: number;
}

export type { Events, LogEntry };
