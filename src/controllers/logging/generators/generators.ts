import { LogEntry } from '../mod.ts';
import { client, ClientEvents, guild, GuildEvents } from './mod.ts';

type Events = ClientEvents & GuildEvents;

/**
 * Represents a list of supported log message generators for various client
 * and guild events.
 */
type MessageGenerators<E extends ClientEvents | GuildEvents = Events> = Partial<
	{
		[key in keyof E]: LogEntry<E, key>;
	}
>;

/**
 * Represents the full collection of message generators for both the client and
 * respective guilds.
 */
interface LogEntryGenerators {
	/** Message generators for the client. */
	client: MessageGenerators<ClientEvents>;

	/** Message generators for custom events defined for guilds. */
	guild: MessageGenerators<GuildEvents>;
}

/** Contains the message generators for the client and for guilds respectively. */
const generators: LogEntryGenerators = { client, guild };

export default generators;
export type { Events, MessageGenerators };
