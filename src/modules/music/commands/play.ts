import {
	ApplicationCommandOptionType,
	Interaction,
	InteractionApplicationCommandData,
} from '../../../../deps.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { ListingResolver, sources } from '../data/sources/sources.ts';
import { title, url } from '../parameters.ts';
import { Client } from '../../../client.ts';

const command: Command = {
	name: 'play',
	availability: Availability.MEMBERS,
	options: Object.entries(sources).map(([name, resolve]) => ({
		name: name.toLowerCase(),
		description: `Requests to play a song from ${name}.`,
		type: ApplicationCommandOptionType.SUB_COMMAND,
		options: [title, url],
		handle: (client, interaction) => play(client, interaction, resolve),
	})),
};

async function play(
	client: Client,
	interaction: Interaction,
	resolve: ListingResolver,
): Promise<void> {
	// Set up information for the controller.
	const controller = client.music.get(interaction.guild!.id)!;
	const data = interaction.data! as InteractionApplicationCommandData;

	// Check if the user can play music.
	if (!(await controller.canPlay(interaction, data))) return;

	// Find the song.
	const listing = await resolve(interaction, data.options[0]!.options![0]!);
	if (!listing) return notFound(interaction);

	// Play the song.
	const state = await interaction.guild!.voiceStates.get(
		interaction.user.id,
	);

	if (!state) {
		console.error(
			`Attempted to play listing requested by ${listing
				?.requestedBy} in a guild with no voice state.`,
		);
		return;
	}

	if (listing) {
		controller.addToQueue(listing);
	}

	controller.play(state.channel!);
}

/**
 * Tells the user that the song they requested was not found.
 *
 * @param interaction - The interaction.
 */
function notFound(interaction: Interaction): void {
	if (interaction.responded) return;

	interaction.respond({
		embeds: [{
			title: 'Couldn\'t find the requested song.',
			description:
				'You could try an alternative search, or request a different song.',
			color: configuration.interactions.responses.colors.red,
		}],
	});
}

export { play };
export default command;
