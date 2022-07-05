import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { user } from '../../parameters.ts';
import { duration, reason } from '../parameters.ts';

const command: Command = {
	name: 'timeout',
	availability: Availability.MODERATORS,
	description:
		'Gives a user a timeout, making them unable to interact on the server.',
	options: [user, reason, duration],
};

export default command;
