import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';

const command: Command = {
	name: 'remove',
	availability: Availability.MEMBERS,
	description: 'Removes a song from the queue.',
	handle: remove,
};

async function remove(
	_client: Client,
	_interaction: Interaction,
): Promise<void> {
	/// TODO(vxern):
	/// Open a selection menu and allow the user to select the song listing to remove.
}

export default command;
