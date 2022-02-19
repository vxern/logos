import { Interaction } from '../../../../deps.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';

const command: Command = {
	name: 'pause',
	availability: Availability.MEMBERS,
	description: 'Pauses the currently playing song.',
	handle: pause,
};

async function pause(interaction: Interaction) {
	/// TODO(vxern):
	/// If there is no song playing, reject interaction nicely.
	/// If the song had already been paused a couple of times, ???
	/// Otherwise, pause the song.
}

export default command;
