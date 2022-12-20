import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { Song, SongStream } from 'logos/src/commands/music/data/types.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { collection, show } from 'logos/src/commands/parameters.ts';
import { isCollection, isOccupied } from 'logos/src/controllers/music.ts';
import { Client } from 'logos/src/client.ts';
import { paginate, parseArguments } from 'logos/src/interactions.ts';
import { chunk } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { displayTime, mention, MentionTypes, trim } from 'logos/formatting.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.now),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayCurrentlyPlaying,
	options: [collection, show],
};

function handleDisplayCurrentlyPlaying([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const currentListing = controller.currentListing;

	if (!isOccupied(controller.player) || currentListing === undefined) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.options.now.strings.noSongPlaying, interaction.locale),
						color: configuration.messages.colors.yellow,
					}],
				},
			},
		);
	}

	const [{ collection, show }] = parseArguments(interaction.data?.options, { collection: 'boolean', show: 'boolean' });

	if (collection !== undefined) {
		if (!isCollection(currentListing?.content)) {
			return void sendInteractionResponse(
				bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							description: localise(Commands.music.options.now.strings.noCollectionPlaying, interaction.locale),
							color: configuration.messages.colors.yellow,
						}],
					},
				},
			);
		}

		const collection = currentListing.content;

		const nowPlayingString = localise(Commands.music.options.now.strings.nowPlaying, interaction.locale);

		return void paginate([client, bot], interaction, {
			elements: chunk(collection.songs, configuration.music.limits.songs.page),
			embed: {
				title: `⬇️ ${nowPlayingString}`,
				color: configuration.messages.colors.blue,
			},
			view: {
				title: localise(Commands.music.options.now.strings.songs, interaction.locale),
				generate: (songs, pageIndex) =>
					songs.length !== 0
						? songs.map((song, index) => {
							const isCurrent = pageIndex * 10 + index === collection.position;

							const titleFormatted = trim(
								song.title
									.replaceAll('(', '❨')
									.replaceAll(')', '❩')
									.replaceAll('[', '⁅')
									.replaceAll(']', '⁆'),
								50,
							);
							const titleHyperlink = `[${titleFormatted}](${song.url})`;
							const titleHighlighted = isCurrent ? `**${titleHyperlink}**` : titleHyperlink;

							return `${pageIndex * 10 + (index + 1)}. ${titleHighlighted}`;
						}).join('\n')
						: localise(Commands.music.strings.listEmpty, interaction.locale),
			},
			show: show ?? false,
		});
	}

	const song = <Song | SongStream> currentListing.content;

	const nowPlayingString = localise(Commands.music.options.now.strings.nowPlaying, interaction.locale);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [{
					title: `⬇️ ${nowPlayingString}`,
					fields: [
						...isCollection(currentListing?.content)
							? [{
								name: localise(Commands.music.options.now.strings.collection, interaction.locale),
								value: currentListing.content.title,
							}, {
								name: localise(Commands.music.options.now.strings.track, interaction.locale),
								value: `${currentListing.content.position + 1}/${currentListing.content.songs.length}`,
							}]
							: [],
						{
							name: localise(Commands.music.options.now.strings.title, interaction.locale),
							value: `[${song.title}](${song.url})`,
							inline: false,
						},
						{
							name: localise(Commands.music.options.now.strings.requestedBy, interaction.locale),
							value: mention(currentListing.requestedBy, MentionTypes.User),
							inline: false,
						},
						{
							name: localise(Commands.music.options.now.strings.runningTime, interaction.locale),
							value: (controller.player.playingSince ?? undefined) !== undefined
								? localise(Commands.music.options.now.strings.playingSince, interaction.locale)(
									displayTime(controller.player.playingSince!),
								)
								: localise(Commands.music.options.now.strings.startTimeUnknown, interaction.locale),
							inline: false,
						},
					],
					footer: {
						text: localise(Commands.music.options.now.strings.sourcedFrom, interaction.locale)(
							currentListing.source ?? localise(Commands.music.options.now.strings.theInternet, interaction.locale),
						),
					},
				}],
			},
		},
	);
}

export default command;
