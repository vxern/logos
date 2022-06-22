import { ApplicationCommandOptionType } from "../../../../deps.ts";
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';

const command: Command = {
	name: 'list',
	availability: Availability.MODERATORS,
	options: [{
		name: 'reprimands',
		description: 'Lists a user\'s reprimands.',
		type: ApplicationCommandOptionType.SUB_COMMAND,
	}],
};

export default command;
