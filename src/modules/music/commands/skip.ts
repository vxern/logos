import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';

const command: Command = {
	name: 'skip',
	availability: Availability.MEMBERS,
	description: 'Skips the currently playing song.',
	handle: skip,
};

async function skip(_client: Client, _interaction: Interaction): Promise<void> {
	/// TODO(vxern):
	/// If there is no song playing, reject interaction nicely.
	/// Otherwise, skip the song.
}

export default command;
