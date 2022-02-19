import { Interaction } from '../../../../deps.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';

const command: Command = {
	name: 'queue',
	availability: Availability.MEMBERS,
	description: 'Displays a list of queued songs.',
	handle: queue,
};

async function queue(interaction: Interaction) {
	/// TODO(vxern):
	/// Display list of songs to be played in a browsable list.
}

export default command;
