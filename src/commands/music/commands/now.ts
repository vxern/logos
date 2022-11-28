import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { Song, SongListingContentTypes, SongStream } from 'logos/src/commands/music/data/types.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { show, collection } from 'logos/src/commands/parameters.ts';
import { Client } from 'logos/src/client.ts';
import { chunk, paginate, parseArguments, trim } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { displayTime, mention, MentionTypes } from 'logos/formatting.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.now),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayCurrentlyPlaying,
	options: [collection, show],
};

function handleDisplayCurrentlyPlaying(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const currentListing = musicController.current;

	if (!musicController.isOccupied || !currentListing) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(
							Commands.music.options.now.strings.noSongPlaying,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	const [{ collection, show }] = parseArguments(
		interaction.data?.options,
		{
			collection: 'boolean',
			show: 'boolean',
		},
	);

	if (collection) {
		if (currentListing?.content.type !== SongListingContentTypes.Collection) {
			return void sendInteractionResponse(
				bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							description: localise(
								Commands.music.options.now.strings.noCollectionPlaying,
								interaction.locale,
							),
							color: configuration.interactions.responses.colors.yellow,
						}],
					},
				},
			);
		}

		const collection = currentListing.content;

		return void paginate([client, bot], interaction, {
			elements: chunk(collection.songs, configuration.music.maxima.songs.page),
			embed: {
				title: `⬇️ ${
					localise(
						Commands.music.options.now.strings.nowPlaying,
						interaction.locale,
					)
				}`,
				color: configuration.interactions.responses.colors.blue,
			},
			view: {
				title: localise(
					Commands.music.options.now.strings.songs,
					interaction.locale,
				),
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

							return `${pageIndex * 10 + (index + 1)}. ${isCurrent ? `**${songString}**` : songString}`;
						}).join('\n')
						: localise(Commands.music.strings.listEmpty, interaction.locale),
			},
			show: show ?? false,
		});
	}

	const song = <Song | SongStream> currentListing.content;

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [{
					title: `⬇️ ${
						localise(
							Commands.music.options.now.strings.nowPlaying,
							interaction.locale,
						)
					}`,
					fields: [
						...currentListing.content.type ===
								SongListingContentTypes.Collection
							? [{
								name: localise(
									Commands.music.options.now.strings.collection,
									interaction.locale,
								),
								value: currentListing.content.title,
							}, {
								name: localise(
									Commands.music.options.now.strings.track,
									interaction.locale,
								),
								value: `${currentListing.content.position + 1}/${currentListing.content.songs.length}`,
							}]
							: [],
						{
							name: localise(
								Commands.music.options.now.strings.title,
								interaction.locale,
							),
							value: `[${song.title}](${song.url})`,
							inline: false,
						},
						{
							name: localise(
								Commands.music.options.now.strings.requestedBy,
								interaction.locale,
							),
							value: mention(currentListing.requestedBy, MentionTypes.User),
							inline: false,
						},
						{
							name: localise(
								Commands.music.options.now.strings.runningTime,
								interaction.locale,
							),
							value: localise(
								Commands.music.options.now.strings.playingSince,
								interaction.locale,
							)(displayTime(musicController.runningTime!)),
							inline: false,
						},
					],
					footer: {
						text: localise(
							Commands.music.options.now.strings.sourcedFrom,
							interaction.locale,
						)(currentListing.source),
					},
				}],
			},
		},
	);
}

export default command;
