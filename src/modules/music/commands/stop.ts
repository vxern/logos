import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';

const command: Command = {
	name: 'stop',
	availability: Availability.MEMBERS,
	description:
		'Stops the current listening session, clearing the queue and song history.',
	handle: stop,
};

async function stop(client: Client, interaction: Interaction): Promise<void> {
	const controller = client.music.get(interaction.guild!.id)!;

	const [canAct, _] = await controller.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	if (!controller.isOccupied) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Nothing to stop',
				description: 'There is no active listening session.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	controller.reset();

	interaction.respond({
		embeds: [{
			title: 'Session ended',
			description:
				'The listening session has been ended, and the song queue and history have been cleared.',
			color: configuration.interactions.responses.colors.blue,
		}],
	});
}

export default command;
