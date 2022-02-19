import { Interaction } from '../../../../deps.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';

const command: Command = {
	name: 'remove',
	availability: Availability.MEMBERS,
	description: 'Removes a song from the queue.',
	handle: remove,
};

async function remove(interaction: Interaction) {
	/// TODO(vxern):
	/// Open a selection menu and allow the user to select the song listing to remove.
}

export default command;
