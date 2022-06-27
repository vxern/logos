import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';

const command: Command = {
	name: 'unskip',
	availability: Availability.MEMBERS,
	description: 'Plays the last played song.',
	handle: unskip,
};

async function unskip(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const controller = client.music.get(interaction.guild!.id)!;

	const [canAct, _] = await controller.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	if (controller.history.length === 0) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Nothing to unskip',
				description: 'There is no song to unskip.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	if (!controller.canPushToQueue) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'The queue is full',
				description:
					'The last played song cannot be unskipped because the song queue is already full.',
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	controller.unskip();

	interaction.respond({
		embeds: [{
			title: '⏮️ Unskipped',
			description: 'The last played song has been brought back.',
			color: configuration.interactions.responses.colors.invisible,
		}],
	});
}

export default command;
