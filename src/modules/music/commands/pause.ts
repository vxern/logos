import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';

const command: Command = {
	name: 'pause',
	availability: Availability.MEMBERS,
	description: 'Pauses the currently playing song.',
	handle: pause,
};

async function pause(
	_client: Client,
	_interaction: Interaction,
): Promise<void> {
	/// TODO(vxern):
	/// If there is no song playing, reject interaction nicely.
	/// If the song had already been paused a couple of times, ???
	/// Otherwise, pause the song.
}

export default command;
