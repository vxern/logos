import { Interaction } from '../../../../deps.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';
import { by, to } from '../parameters.ts';

const command: Command = {
	name: 'rewind',
	availability: Availability.MEMBERS,
	description: 'Rewinds the currently playing song.',
	options: [by, to],
};

async function rewind(interaction: Interaction) {
	/// TODO(vxern):
	/// If neither option has been supplied, reject interaction.
	/// If either option is not valid, reject interaction.
	/// If there is no song playing, reject interaction nicely.
	/// If the timestamp reaches farther than the beginning, replay it.
	/// Otherwise, rewind the song 'by' or 'to' the given timestamp.
}

export default command;
