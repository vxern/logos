import constants from "../../../../constants/constants";
import { defaultLocale } from "../../../../constants/language";
import defaults from "../../../../defaults";
import { MentionTypes, mention, timestamp, trim } from "../../../../formatting";
import { Client, localise } from "../../../client";
import { paginate, parseArguments, reply } from "../../../interactions";
import { isCollection } from "../../../services/music/music";
import { chunk } from "../../../utils";
import { OptionTemplate } from "../../command";
import { collection, show } from "../../parameters";
import { Song, SongCollection, SongStream } from "../data/types";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "now",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayCurrentlyPlaying,
	options: [collection, show],
};

async function handleDisplayCurrentlyPlaying(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ collection, show }] = parseArguments(interaction.data?.options, { collection: "boolean", show: "boolean" });

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.services.music.music.get(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(bot, interaction);
	if (isVoiceStateVerified === undefined || !isVoiceStateVerified) {
		return;
	}

	const [current, isOccupied, playingSince] = [
		musicService.current,
		musicService.isOccupied,
		musicService.playingSince,
	];
	if (current === undefined || isOccupied === undefined) {
		return;
	}

	const locale = show ? defaultLocale : interaction.locale;

	if (collection) {
		if (!isOccupied || current === undefined) {
			const strings = {
				title: localise(client, "music.options.now.strings.noSongCollection.title", interaction.locale)(),
				description: {
					noSongCollection: localise(
						client,
						"music.options.now.strings.noSongCollection.description.noSongCollection",
						interaction.locale,
					)(),
				},
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description.noSongCollection,
						color: constants.colors.dullYellow,
					},
				],
			});
			return;
		} else if (!isCollection(current.content)) {
			const strings = {
				title: localise(client, "music.options.now.strings.noSongCollection.title", interaction.locale)(),
				description: {
					noSongCollection: localise(
						client,
						"music.options.now.strings.noSongCollection.description.noSongCollection",
						interaction.locale,
					)(),
					trySongInstead: localise(
						client,
						"music.options.now.strings.noSongCollection.description.trySongInstead",
						interaction.locale,
					)(),
				},
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
						color: constants.colors.dullYellow,
					},
				],
			});
			return;
		}
	} else {
		if (!isOccupied || current === undefined) {
			const strings = {
				title: localise(client, "music.options.now.strings.noSong.title", interaction.locale)(),
				description: localise(client, "music.options.now.strings.noSong.description", interaction.locale)(),
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					},
				],
			});
			return;
		}
	}

	if (collection) {
		const collection = current.content as SongCollection;

		const strings = {
			nowPlaying: localise(client, "music.options.now.strings.nowPlaying", locale)(),
			songs: localise(client, "music.options.now.strings.songs", locale)(),
			listEmpty: localise(client, "music.strings.listEmpty", locale)(),
		};

		paginate([client, bot], interaction, {
			elements: chunk(collection.songs, defaults.RESULTS_PER_PAGE),
			embed: {
				title: `${constants.symbols.music.nowPlaying} ${strings.nowPlaying}`,
				color: constants.colors.blue,
			},
			view: {
				title: strings.songs,
				generate: (songs, pageIndex) => {
					if (songs.length === 0) {
						return strings.listEmpty;
					}

					return songs
						.map((song, index) => {
							const isCurrent = pageIndex * 10 + index === collection.position;

							const titleFormatted = trim(
								song.title.replaceAll("(", "❨").replaceAll(")", "❩").replaceAll("[", "⁅").replaceAll("]", "⁆"),
								50,
							);
							const titleHyperlink = `[${titleFormatted}](${song.url})`;
							const titleHighlighted = isCurrent ? `**${titleHyperlink}**` : titleHyperlink;

							return `${pageIndex * 10 + (index + 1)}. ${titleHighlighted}`;
						})
						.join("\n");
				},
			},
			show: show ?? false,
		});
		return;
	}

	const song = current.content as Song | SongStream;

	const strings = {
		nowPlaying: localise(client, "music.options.now.strings.nowPlaying", locale)(),
		collection: localise(client, "music.options.now.strings.collection", locale)(),
		track: localise(client, "music.options.now.strings.track", locale)(),
		title: localise(client, "music.options.now.strings.title", locale)(),
		requestedBy: localise(client, "music.options.now.strings.requestedBy", locale)(),
		runningTime: localise(client, "music.options.now.strings.runningTime", locale)(),
		playingSince: localise(
			client,
			"music.options.now.strings.playingSince",
			locale,
		)({ relative_timestamp: timestamp(playingSince ?? 0) }),
		startTimeUnknown: localise(client, "music.options.now.strings.startTimeUnknown", locale)(),
		sourcedFrom: localise(
			client,
			"music.options.now.strings.sourcedFrom",
			locale,
		)({
			source: current.source ?? localise(client, "music.options.now.strings.theInternet", locale)(),
		}),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.nowPlaying} ${strings.nowPlaying}`,
					color: constants.colors.blue,
					fields: [
						...(isCollection(current.content)
							? [
									{
										name: strings.collection,
										value: current.content.title,
									},
									{
										name: strings.track,
										value: `${current.content.position + 1}/${current.content.songs.length}`,
									},
							  ]
							: []),
						{
							name: strings.title,
							value: `[${song.title}](${song.url})`,
							inline: false,
						},
						{
							name: strings.requestedBy,
							value: mention(current.requestedBy, MentionTypes.User),
							inline: false,
						},
						{
							name: strings.runningTime,
							value: playingSince !== undefined ? strings.playingSince : strings.startTimeUnknown,
							inline: false,
						},
					],
					footer: { text: strings.sourcedFrom },
				},
			],
		},
		{ visible: show },
	);
}

export default command;
