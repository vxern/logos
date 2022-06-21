import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { by, to } from '../parameters.ts';

const command: Command = {
	name: 'forward',
	availability: Availability.MEMBERS,
	description: 'Fast-forwards the currently playing song.',
	options: [by, to],
	handle: forward,
};

async function forward(
	_client: Client,
	_interaction: Interaction,
): Promise<void> {
	/// TODO(vxern):
	/// If neither option has been supplied, reject interaction.
	/// If either option is not valid, reject interaction.
	/// If there is no song playing, reject interaction nicely.
	/// If the timestamp reaches farther than the duration of the song, skip it.
	/// Otherwise, fast-forward the song 'by' or 'to' the given timestamp.
}

export default command;
