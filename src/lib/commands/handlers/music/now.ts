import { mention, timestamp } from "logos:core/formatting";
import { Client } from "logos/client";
import { SongCollectionView } from "logos/commands/components/paginated-views/song-collection-view";
import { AudioStream, Song, SongCollection } from "logos/services/music";

async function handleDisplayCurrentlyPlaying(
	client: Client,
	interaction: Logos.Interaction<any, { collection: boolean | undefined }>,
): Promise<void> {
	const locale = interaction.parameters.show ? interaction.guildLocale : interaction.locale;

	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyVoiceState(interaction, "check");
	if (!isVoiceStateVerified) {
		return;
	}

	const isOccupied = musicService.isOccupied;
	if (!isOccupied) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.notPlaying.title", locale)(),
			description: {
				toCheck: client.localise("music.strings.notPlaying.description.toCheck", locale)(),
			},
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description.toCheck,
		});

		return;
	}

	const playingSince = musicService.playingSince;

	if (interaction.parameters.collection) {
		if (!(musicService.session.queueable instanceof SongCollection)) {
			const locale = interaction.locale;
			const strings = {
				title: client.localise("music.options.now.strings.noSongCollection.title", locale)(),
				description: {
					noSongCollection: client.localise(
						"music.options.now.strings.noSongCollection.description.noSongCollection",
						locale,
					)(),
					trySongInstead: client.localise(
						"music.options.now.strings.noSongCollection.description.trySongInstead",
						locale,
					)(),
				},
			};

			await client.warning(interaction, {
				title: strings.title,
				description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
			});

			return;
		}
	}

	// TODO(vxern): Remove this.
	/*
  else if (current?.content === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.now.strings.noSong.title", locale)(),
			description: client.localise("music.options.now.strings.noSong.description", locale)(),
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}*/

	if (interaction.parameters.collection) {
		const collection = musicService.session.queueable as SongCollection;

		const locale = interaction.locale;
		const strings = {
			nowPlaying: client.localise("music.options.now.strings.nowPlaying", locale)(),
			songs: client.localise("music.options.now.strings.songs", locale)(),
		};

		const view = new SongCollectionView(client, {
			interaction,
			title: `${constants.emojis.music.nowPlaying} ${strings.nowPlaying}`,
			collection,
		});

		await view.open();

		return;
	}

	const song = musicService.session.queueable as Song | AudioStream;

	const strings = {
		nowPlaying: client.localise("music.options.now.strings.nowPlaying", locale)(),
		collection: client.localise("music.options.now.strings.collection", locale)(),
		track: client.localise("music.options.now.strings.track", locale)(),
		title: client.localise("music.options.now.strings.title", locale)(),
		requestedBy: client.localise("music.options.now.strings.requestedBy", locale)(),
		runningTime: client.localise("music.options.now.strings.runningTime", locale)(),
		playingSince: client.localise(
			"music.options.now.strings.playingSince",
			locale,
		)({ relative_timestamp: timestamp(playingSince ?? 0, { format: "relative" }) }),
		startTimeUnknown: client.localise("music.options.now.strings.startTimeUnknown", locale)(),
		sourcedFrom: client.localise(
			"music.options.now.strings.sourcedFrom",
			locale,
		)({
			source: musicService.session.current.source ?? client.localise("music.options.now.strings.theInternet", locale)(),
		}),
	};

	await client.notice(
		interaction,
		{
			title: `${constants.emojis.music.nowPlaying} ${strings.nowPlaying}`,
			fields: [
				{
					name: strings.title,
					value: `[${song.title}](${song.url})`,
					inline: false,
				},
				{
					name: strings.requestedBy,
					value: mention(musicService.session.current.userId, { type: "user" }),
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
		{ visible: interaction.parameters.show },
	);
}

export { handleDisplayCurrentlyPlaying };
