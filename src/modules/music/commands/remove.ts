import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';

const command: Command = {
	name: 'remove',
	availability: Availability.MEMBERS,
	description: 'Removes a song from the queue.',
	handle: remove,
};

async function remove(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const controller = client.music.get(interaction.guild!.id)!;

	const [canAct, _] = await controller.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	/// TODO(vxern):
	/// Open a selection menu and allow the user to select the song listing to remove.
}

export default command;
