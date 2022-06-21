import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { user } from '../../parameters.ts';
import { reason } from '../parameters.ts';

const command: Command = {
	name: 'ban',
	availability: Availability.MODERATORS,
	description: 'Bans a user from the server, making them unable to rejoin it.',
	options: [user, reason],
};

export default command;
