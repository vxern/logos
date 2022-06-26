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

function skip(client: Client, interaction: Interaction): void {
	const controller = client.music.get(interaction.guild!.id)!;

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

	controller.skip(interaction);
}

export default command;
