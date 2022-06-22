import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';

const command: Command = {
	name: 'unpause',
	availability: Availability.MEMBERS,
	description: 'Unpauses the currently playing song.',
	handle: unpause,
};

async function unpause(
	_client: Client,
	_interaction: Interaction,
): Promise<void> {
	/// TODO(vxern):
	/// If there is no song playing, reject interaction nicely.
	/// Otherwise, unpause the song.
}

export default command;
