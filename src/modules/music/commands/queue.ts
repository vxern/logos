import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';

const command: Command = {
	name: 'queue',
	availability: Availability.MEMBERS,
	description: 'Displays a list of queued songs.',
	handle: queue,
};

async function queue(
	_client: Client,
	_interaction: Interaction,
): Promise<void> {
	/// TODO(vxern):
	/// Display list of songs to be played in a browsable list.
}

export default command;
