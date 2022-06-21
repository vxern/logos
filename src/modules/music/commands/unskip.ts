import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';

const command: Command = {
	name: 'unskip',
	availability: Availability.MEMBERS,
	description: 'Plays the last played song.',
	handle: unskip,
};

async function unskip(
	_client: Client,
	_interaction: Interaction,
): Promise<void> {
	/// TODO(vxern):
	/// If there is no song in history, reject interaction nicely.
	/// Otherwise, unskip the song.
}

export default command;
