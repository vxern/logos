import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { user } from '../../parameters.ts';

const command: Command = {
	name: 'praise',
	availability: Availability.MEMBERS,
	description: 'Praises a user for their contribution.',
	options: [user],
};

export default command;
