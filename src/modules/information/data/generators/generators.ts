import { ClientEvents } from '../../../../../deps.ts';
import client from './client.ts';
import { MessageGenerators } from './generator.ts';
import guild, { GuildEvents } from './guild.ts';

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
const generators: LogEntryGenerators = {
	client: client,
	guild: guild,
};

export default generators;
