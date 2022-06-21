import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';

const command: Command = {
	name: 'replay',
	availability: Availability.MEMBERS,
	description: 'Begins playing the currently playing song from the start.',
	handle: replay,
};

async function replay(
	_client: Client,
	_interaction: Interaction,
): Promise<void> {
	/// TODO(vxern):
	/// If there is no song playing, reject interaction nicely.
	/// Otherwise, start playing the current song from the start.
}

export default command;
