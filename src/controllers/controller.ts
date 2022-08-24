import { Guild } from '../../deps.ts';
import { Client } from '../client.ts';

/** Represents the controller of a particular function of the bot. */
abstract class Controller {
	/** The client instance this controller belongs to. */
	protected readonly client: Client;

	/** The guild this controller is assigned to. */
	protected readonly guild: Guild;

	/** Constructs a {@link Controller}. */
	constructor(client: Client, guild: Guild) {
		this.client = client;
		this.guild = guild;
	}
}

export { Controller };
