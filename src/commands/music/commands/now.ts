import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { mention, MentionTypes } from '../../../formatting.ts';
import { chunk, paginate, trim } from '../../../utils.ts';
import { Song } from '../data/song.ts';
import { SongStream } from '../data/song-stream.ts';
import { SongListingContentTypes } from '../data/song-listing.ts';
import { show } from '../../parameters.ts';
import { collection } from "../parameters.ts";

const command: OptionBuilder = {
	name: 'now',
	nameLocalizations: {
		pl: 'teraz',
		ro: 'acum',
	},
	description: 'Displays the currently playing song.',
	descriptionLocalizations: {
		pl: 'Wyświetla obecnie odtwarzany utwór lub zbiór utworów.',
		ro: 'Afișează melodia sau setul de melodii în curs de redare.',
	},
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: displayNowPlaying,
	options: [collection, show],
};

function displayNowPlaying(client: Client, interaction: Interaction): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const currentListing = musicController.current;

	if (!musicController.isOccupied || !currentListing) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'No song playing',
						description: 'There is no song to display the details of.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	const data = interaction.data;
	if (!data) return;

	const showCollection =
		(<boolean | undefined> data.options?.find((option) =>
			option.name === 'collection'
		)?.value) ?? false;
	const show =
		(<boolean | undefined> data.options?.find((option) =>
			option.name === 'show'
		)?.value) ?? false;

	if (showCollection) {
		if (currentListing?.content.type !== SongListingContentTypes.Collection) {
			return void sendInteractionResponse(
				client.bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							title: 'Not playing a collection',
							description:
								'There is no song collection to show the details of. Try requesting information about the current song instead.',
							color: configuration.interactions.responses.colors.yellow,
						}],
					},
				},
			);
		}

		const collection = currentListing.content;

		return void paginate(client, interaction, {
			elements: chunk(collection.songs, configuration.music.maxima.songs.page),
			embed: {
				title: '⬇️ Now playing',
				color: configuration.interactions.responses.colors.blue,
			},
			view: {
				title: 'Songs',
				generate: (songs, pageIndex) =>
					songs.length !== 0
						? songs.map((song, index) => {
							const isCurrent = pageIndex * 10 + index === collection.position;
							const songString = `[${
								trim(
									song.title
										.replaceAll('(', '❨')
										.replaceAll(')', '❩')
										.replaceAll('[', '⁅')
										.replaceAll(']', '⁆'),
									50,
								)
							}](${song.url})`;

							return `${pageIndex * 10 + (index + 1)}. ${
								isCurrent ? `**${songString}**` : songString
							}`;
						}).join('\n')
						: 'This list is empty.',
			},
			show: show,
		});
	}

	const song = <Song | SongStream> currentListing.content;

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [{
					title: '⬇️ Now playing',
					fields: [
						...currentListing.content.type ===
								SongListingContentTypes.Collection
							? [{
								name: 'Collection',
								value: currentListing.content.title,
							}, {
								name: 'Track',
								value: `${
									currentListing.content.position + 1
								}/${currentListing.content.songs.length}`,
							}]
							: [],
						{
							name: 'Title',
							value: `[${song.title}](${song.url})`,
							inline: true,
						},
						{
							name: 'Requested By',
							value: mention(currentListing.requestedBy, MentionTypes.User),
						},
					],
					footer: {
						text: `This listing was sourced from ${
							currentListing.source ?? 'the internet'
						}.`,
					},
				}],
			},
		},
	);
}

export default command;
