import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';
import { user } from '../../parameters.ts';
import { reason } from '../parameters.ts';

const command: Command = {
	name: 'kick',
	availability: Availability.MODERATORS,
	description: 'Kicks a user from the server.',
	options: [user, reason],
};

export default command;
