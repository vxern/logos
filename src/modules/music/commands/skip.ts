import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';

const command: Command = {
	name: 'skip',
	availability: Availability.MEMBERS,
	description: 'Skips the currently playing song.',
	handle: skip,
};

async function skip(client: Client, interaction: Interaction): Promise<void> {
	const controller = client.music.get(interaction.guild!.id)!;

	const [canAct, _] = await controller.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	if (!controller.isOccupied) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Nothing to skip',
				description: 'There is no song to skip.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	controller.skip();

	interaction.respond({
		embeds: [{
			title: '⏭️ Skipped',
			description: 'The current song has been skipped.',
			color: configuration.interactions.responses.colors.invisible,
		}],
	});
}

export default command;
