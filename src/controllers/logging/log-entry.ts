import { Client } from '../../mod.ts';

/** Represents an entry in the log channel. */
interface LogEntry<E extends Record<string, unknown[]>, K extends keyof E> {
	/** Title of this entry. */
	title: string;

	/** Content of this entry. */
	message: (
		client: Client,
		...args: E[K]
	) => Promise<string> | string | undefined;

	/** A condition that must be met for this entry to be logged. */
	filter: (client: Client, originGuildId: bigint, ...args: E[K]) => boolean;

	/** The colour of this entry. */
	color: number;
}

export type { LogEntry };
