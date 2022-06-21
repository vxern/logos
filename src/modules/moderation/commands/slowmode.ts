import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { duration } from '../parameters.ts';

const command: Command = {
	name: 'slowmode',
	availability: Availability.MODERATORS,
	description: 'Enables slowmode in a channel.',
	options: [duration],
};

export default command;
