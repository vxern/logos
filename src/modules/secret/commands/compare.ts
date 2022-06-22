import { ApplicationCommandOptionType } from '../../../../deps.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { compareGuildChannelStructures } from './compare/server/structures.ts';

const command: Command = {
	name: 'compare',
	availability: Availability.OWNER,
	options: [{
		name: 'server',
		type: ApplicationCommandOptionType.SUB_COMMAND_GROUP,
		options: [{
			name: 'structures',
			description:
				'Compares the server\'s server structure to that of the template guild.',
			type: ApplicationCommandOptionType.SUB_COMMAND,
			handle: compareGuildChannelStructures,
		}, {
			name: 'roles',
			description:
				'Compares the server\'s role list to that of the template guild.',
			type: ApplicationCommandOptionType.SUB_COMMAND,
		}],
	}],
};

export default command;
