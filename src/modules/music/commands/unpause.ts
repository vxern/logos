import { Interaction } from '../../../../deps.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';

const command: Command = {
	name: 'unpause',
	availability: Availability.MEMBERS,
	description: 'Unpauses the currently playing song.',
	handle: unpause,
};

async function unpause(interaction: Interaction) {
	/// TODO(vxern):
	/// If there is no song playing, reject interaction nicely.
	/// Otherwise, unpause the song.
}

export default command;
