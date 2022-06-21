import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';

const command: Command = {
	name: 'history',
	availability: Availability.MEMBERS,
	description: 'Displays a list of previously played songs.',
	handle: history,
};

async function history(
	_client: Client,
	_interaction: Interaction,
): Promise<void> {
	/// TODO(vxern):
	/// Display list of played songs in a browsable list.
}

export default command;
