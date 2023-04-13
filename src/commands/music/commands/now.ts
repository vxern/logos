import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { Song, SongCollection, SongStream } from 'logos/src/commands/music/data/types.ts';
import { OptionTemplate } from 'logos/src/commands/command.ts';
import { collection, show } from 'logos/src/commands/parameters.ts';
import { isCollection, isOccupied } from 'logos/src/controllers/music.ts';
import { Client, localise } from 'logos/src/client.ts';
import { paginate, parseArguments, reply } from 'logos/src/interactions.ts';
import { chunk } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes, timestamp, trim } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionTemplate = {
	name: 'now',
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayCurrentlyPlaying,
	options: [collection, show],
};

function handleDisplayCurrentlyPlaying([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ collection, show }] = parseArguments(interaction.data?.options, { collection: 'boolean', show: 'boolean' });

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const locale = show ? defaultLocale : interaction.locale;

	const currentListing = controller.currentListing;

	if (!collection) {
		if (!isOccupied(controller.player) || currentListing === undefined) {
			const strings = {
				title: localise(client, 'music.options.now.strings.noSong.title', interaction.locale)(),
				description: localise(client, 'music.options.now.strings.noSong.description', interaction.locale)(),
			};

			return void reply([client, bot], interaction, {
				embeds: [{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				}],
			});
		}
	} else {
		if (!isOccupied(controller.player) || currentListing === undefined) {
			const strings = {
				title: localise(
					client,
					'music.options.now.strings.noSongCollection.title',
					interaction.locale,
				)(),
				description: {
					noSongCollection: localise(
						client,
						'music.options.now.strings.noSongCollection.description.noSongCollection',
						interaction.locale,
					)(),
				},
			};

			return void reply([client, bot], interaction, {
				embeds: [{
					title: strings.title,
					description: strings.description.noSongCollection,
					color: constants.colors.dullYellow,
				}],
			});
		} else if (!isCollection(currentListing.content)) {
			const strings = {
				title: localise(
					client,
					'music.options.now.strings.noSongCollection.title',
					interaction.locale,
				)(),
				description: {
					noSongCollection: localise(
						client,
						'music.options.now.strings.noSongCollection.description.noSongCollection',
						interaction.locale,
					)(),
					trySongInstead: localise(
						client,
						'music.options.now.strings.noSongCollection.description.trySongInstead',
						interaction.locale,
					)(),
				},
			};

			return void reply([client, bot], interaction, {
				embeds: [{
					title: strings.title,
					description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
					color: constants.colors.dullYellow,
				}],
			});
		}
	}

	if (collection) {
		const collection = currentListing.content as SongCollection;

		const strings = {
			nowPlaying: localise(client, 'music.options.now.strings.nowPlaying', locale)(),
			songs: localise(client, 'music.options.now.strings.songs', locale)(),
			listEmpty: localise(client, 'music.strings.listEmpty', locale)(),
		};

		return void paginate([client, bot], interaction, {
			elements: chunk(collection.songs, configuration.music.limits.songs.page),
			embed: {
				title: `${constants.symbols.music.nowPlaying} ${strings.nowPlaying}`,
				color: constants.colors.blue,
			},
			view: {
				title: strings.songs,
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
						: strings.listEmpty,
			},
			show: show ?? false,
		});
	}

	const song = currentListing.content as Song | SongStream;

	const strings = {
		nowPlaying: localise(client, 'music.options.now.strings.nowPlaying', locale)(),
		collection: localise(client, 'music.options.now.strings.collection', locale)(),
		track: localise(client, 'music.options.now.strings.track', locale)(),
		title: localise(client, 'music.options.now.strings.title', locale)(),
		requestedBy: localise(client, 'music.options.now.strings.requestedBy', locale)(),
		runningTime: localise(client, 'music.options.now.strings.runningTime', locale)(),
		playingSince: localise(client, 'music.options.now.strings.playingSince', locale)(
			{ 'relative_timestamp': timestamp(controller.player.playingSince!) },
		),
		startTimeUnknown: localise(client, 'music.options.now.strings.startTimeUnknown', locale)(),
		sourcedFrom: localise(client, 'music.options.now.strings.sourcedFrom', locale)(
			{
				'source': currentListing.source ?? localise(client, 'music.options.now.strings.theInternet', locale)(),
			},
		),
	};

	return void reply([client, bot], interaction, {
		embeds: [{
			title: `${constants.symbols.music.nowPlaying} ${strings.nowPlaying}`,
			fields: [
				...isCollection(currentListing?.content)
					? [{
						name: strings.collection,
						value: currentListing.content.title,
					}, {
						name: strings.track,
						value: `${currentListing.content.position + 1}/${currentListing.content.songs.length}`,
					}]
					: [],
				{
					name: strings.title,
					value: `[${song.title}](${song.url})`,
					inline: false,
				},
				{
					name: strings.requestedBy,
					value: mention(currentListing.requestedBy, MentionTypes.User),
					inline: false,
				},
				{
					name: strings.runningTime,
					value: (controller.player.playingSince ?? undefined) !== undefined
						? strings.playingSince
						: strings.startTimeUnknown,
					inline: false,
				},
			],
			footer: { text: strings.sourcedFrom },
		}],
	}, { visible: show });
}

export default command;
