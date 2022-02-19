import { Guild } from '../../deps.ts';

abstract class Controller {
	readonly guild: Guild;

	constructor(guild: Guild) {
		this.guild = guild;
	}
}

export { Controller };
