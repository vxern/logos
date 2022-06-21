import { Guild } from '../../deps.ts';

/** Represents a controller of a particular function of the bot. */
abstract class Controller {
	/** The guild this controller is assigned to. */
	protected readonly guild: Guild;

	/** Constructs a {@link Controller}. */
	constructor(guild: Guild) {
		this.guild = guild;
	}
}

export { Controller };
