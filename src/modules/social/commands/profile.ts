import { ApplicationCommandOptionType } from '../../../../deps.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { user } from '../../parameters.ts';

const command: Command = {
	name: 'profile',
	availability: Availability.MEMBERS,
	options: [{
		name: 'view',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		description: 'Displays the user\'s profile.',
		options: [user],
	}],
};

export default command;
