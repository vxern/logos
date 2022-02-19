import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';
import { duration } from '../parameters.ts';

const command: Command = {
	name: 'slowmode',
	availability: Availability.MODERATORS,
	description: 'Enables slowmode in a channel.',
	options: [duration],
};

export default command;
