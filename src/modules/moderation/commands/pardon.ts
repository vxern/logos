import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { user } from '../../parameters.ts';
import { reason } from '../parameters.ts';

const command: Command = {
	name: 'pardon',
	availability: Availability.MODERATORS,
	description: 'Pardons the user from the last given reprimand.',
	options: [user, reason],
};

export default command;
