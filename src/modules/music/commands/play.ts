import {
	ApplicationCommandInteraction,
	ApplicationCommandOptionType,
	GuildTextChannel,
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
	interaction: ApplicationCommandInteraction,
	resolve: ListingResolver,
): Promise<void> {
	const controller = client.music.get(interaction.guild!.id)!;

	const [canPlay, voiceState] = await controller.verifyCanPlay(interaction);
	if (!canPlay) return;

	const listing = await resolve(
		client,
		interaction,
		interaction.data.options[0]!.options![0]!,
	);

	if (!listing) {
		if (interaction.responded) return;

		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Couldn\'t find the requested song.',
				description:
					'You could try an alternative search, or request a different song.',
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	if (!interaction.responded) {
		await interaction.defer();
	}

	controller.play({
		interaction: interaction.deferred ? interaction : undefined,
		listing: listing,
		channels: {
			text: interaction.channel as GuildTextChannel,
			voice: voiceState!.channel!,
		},
	});
}

export { play };
export default command;
