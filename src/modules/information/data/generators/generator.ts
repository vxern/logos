import { ClientEvents } from '../../../../../deps.ts';
import { LogEntry } from '../log-entry.ts';
import { GuildEvents } from './guild.ts';

/**
 * Represents a list of supported log message generators for various client
 * and guild events.
 */
type MessageGenerators<T extends ClientEvents | GuildEvents> = Partial<
	{
		[key in keyof T]: LogEntry<key>;
	}
>;

export type { MessageGenerators };
