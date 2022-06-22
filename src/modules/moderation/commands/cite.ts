import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { index } from '../../parameters.ts';

const command: Command = {
	name: 'cite',
	availability: Availability.MODERATORS,
	description: 'Cites a server rule.',
	options: [index],
};

export default command;
