import { Interaction } from '../../../../deps.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';

const command: Command = {
	name: 'skip',
	availability: Availability.MEMBERS,
	description: 'Skips the currently playing song.',
	handle: skip,
};

async function skip(interaction: Interaction) {
	/// TODO(vxern):
	/// If there is no song playing, reject interaction nicely.
	/// Otherwise, skip the song.
}

export default command;
