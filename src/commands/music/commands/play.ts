import { OptionBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { ListingResolver, sources } from '../data/sources/sources.ts';
import { query } from '../parameters.ts';
import { Client } from '../../../client.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { SongListingContentTypes } from '../data/song-listing.ts';

const command: OptionBuilder = {
	name: 'play',
	nameLocalizations: {
		pl: 'odtwórz',
		ro: 'redă',
	},
	description: 'Allows the user to play music in a voice channel.',
	descriptionLocalizations: {
		pl: 'Pozwala użytkownikowi na odtwarzanie muzyki w kanale głosowym.',
		ro: 'Permite utilizatorului să redea muzică într-un canal de voce.',
	},
	type: ApplicationCommandOptionTypes.SubCommandGroup,
	options: [
		{
			name: 'stream',
			nameLocalizations: {
				pl: 'strumień',
				ro: 'flux',
			},
			description: 'Plays an audio stream.',
			descriptionLocalizations: {
				pl: 'Odtwarza muzykę w kształcie strumienia danych.',
				ro: 'Redă muzică în forma unui flux de date.',
			},
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: playStream,
			options: [{
				name: 'url',
				nameLocalizations: {
					pl: 'url',
					ro: 'url',
				},
				description: 'The link to the stream.',
				descriptionLocalizations: {
					pl: 'Link do muzyki w kształcie strumienia danych.',
					ro: 'Link-ul către muzică în forma unui flux de date.',
				},
				type: ApplicationCommandOptionTypes.String,
				required: false,
			}],
		},
		...Object.entries(sources).map<OptionBuilder>(([name, resolve]) => ({
			name: name.toLowerCase(),
			nameLocalizations: {},
			description: `Plays a song from ${name}.`,
			descriptionLocalizations: {
				pl: `Odtwarza muzykę dostępną na ${name}.`,
				ro: `Redă muzică disponibilă pe ${name}.`,
			},
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: (client, interaction) =>
				playSongListing(client, interaction, resolve),
			options: [query],
		})),
	],
};

function playStream(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	return playSongListing(
		client,
		interaction,
		(_client, interaction, query) =>
			new Promise((resolve) =>
				resolve({
					requestedBy: interaction.user.id,
					content: {
						type: SongListingContentTypes.Stream,
						title: 'Song stream',
						url: query,
					},
				})
			),
	);
}

async function playSongListing(
	client: Client,
	interaction: Interaction,
	resolveToSongListing: ListingResolver,
): Promise<void> {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const titleOrUrl = <string | undefined> interaction.data?.options?.at(0)
		?.options?.at(0)?.options?.at(0)?.value;
	if (!titleOrUrl) return;

	const [canPlay, voiceState] = musicController.verifyCanPlay(interaction);
	if (!canPlay || !voiceState) return;

	const songListing = await resolveToSongListing(
		client,
		interaction,
		titleOrUrl,
	);

	if (!songListing) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Couldn\'t find the requested song.',
						description:
							'You could try an alternative search, or request a different song.',
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	const textChannel = client.channels.get(interaction.channelId!);
	if (!textChannel) return;

	const voiceChannel = client.channels.get(voiceState.channelId!);
	if (!voiceChannel) return;

	return void musicController.play(client, {
		interaction: interaction,
		songListing: songListing,
		channels: { text: textChannel, voice: voiceChannel },
	});
}

export { playSongListing };
export default command;
