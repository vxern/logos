import {
	Interaction,
	InteractionApplicationCommandData,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';
import { play } from './play.ts';

const command: Command = {
	name: 'replay',
	availability: Availability.MEMBERS,
	description: 'Begins playing the currently playing song from the start.',
	handle: replay,
};

async function replay(interaction: Interaction) {
	// Set up information for the controller.
	const controller = Client.music.get(interaction.guild!.id)!;
	const state = await interaction.guild!.voiceStates.get(
		interaction.user.id,
	);
	const data = interaction.data! as InteractionApplicationCommandData;

	// Check if the user can play music.
	if (!controller.canPlay(interaction, data)) return;

	// Check if the controller is already managing a song.
	if (!controller.isOccupied) {
		interaction.respond({
			embeds: [{
				title: 'There is no song playing.',
				description: 'To play a song, use the `play` command.',
			}],
		});
		return;
	}

	// Play the song.
	//play(controller, interaction);

	/// TODO(vxern):
	/// If there is no song playing, reject interaction nicely.
	/// Otherwise, start playing the current song from the start.
}

export default command;
