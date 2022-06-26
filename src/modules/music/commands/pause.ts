import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';

const command: Command = {
	name: 'pause',
	availability: Availability.MEMBERS,
	description: 'Pauses the currently playing song.',
	handle: pause,
};

function pause(
	client: Client,
	interaction: Interaction,
): void {
	const controller = client.music.get(interaction.guild!.id)!;

	if (!controller.isOccupied) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Nothing to pause',
				description: 'There is no song to pause.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	if (controller.isPaused) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Already paused',
				description: 'The current song is already paused.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	controller.pause(interaction);
}

export default command;
