import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';

const command: Command = {
	name: 'now',
	availability: Availability.MEMBERS,
	description: 'Displays the currently playing song.',
	handle: now,
};

async function now(_client: Client, _interaction: Interaction): Promise<void> {
	/// TODO(vxern):
	/// Display the current playing song.
}

export default command;
