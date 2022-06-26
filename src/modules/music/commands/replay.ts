import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';

const command: Command = {
	name: 'replay',
	availability: Availability.MEMBERS,
	description: 'Begins playing the currently playing song from the start.',
	handle: replay,
};

function replay(
	client: Client,
	interaction: Interaction,
): void {
	const controller = client.music.get(interaction.guild!.id)!;

	if (!controller.isOccupied) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Nothing to replay',
				description: 'There is no song to replay.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	controller.replay();
}

export default command;
