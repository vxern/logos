import { Interaction } from '../../../../deps.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';

const command: Command = {
	name: 'history',
	availability: Availability.MEMBERS,
	description: 'Displays a list of previously played songs.',
	handle: history,
};

async function history(interaction: Interaction) {
	/// TODO(vxern):
	/// Display list of played songs in a browsable list.
}

export default command;
