import { mention, timestamp } from "logos:core/formatting";
import type { Client } from "logos/client";
import { SongCollectionView } from "logos/commands/components/paginated-views/song-collection-view";
import { SongCollection } from "logos/services/music";

async function handleDisplayCurrentlyPlaying(
	client: Client,
	interaction: Logos.Interaction<any, { collection: boolean | undefined }>,
): Promise<void> {
	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canCheckPlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const strings = constants.contexts.noSongToShowInformationAbout({
			localise: client.localise,
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (interaction.parameters.collection) {
		if (!(musicService.session.queueable instanceof SongCollection)) {
			const strings = constants.contexts.noSongCollectionToShowInformationAbout({
				localise: client.localise,
				locale: interaction.locale,
			});

			await client.warning(interaction, {
				title: strings.title,
				description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
			});

			return;
		}

		const collection = musicService.session.queueable as SongCollection;

		const strings = constants.contexts.nowPlayingSong({
			localise: client.localise,
			locale: interaction.parameters.show ? interaction.guildLocale : interaction.locale,
		});

		const view = new SongCollectionView(client, {
			interaction,
			title: `${constants.emojis.music.nowPlaying} ${strings.nowPlaying}`,
			collection,
		});

		await view.open();

		return;
	}

	const strings = constants.contexts.nowPlayingSongCollection({
		localise: client.localise,
		locale: interaction.parameters.show ? interaction.guildLocale : interaction.locale,
	});

	await client.notice(
		interaction,
		{
			title: `${constants.emojis.music.nowPlaying} ${strings.nowPlaying}`,
			fields: [
				{
					name: strings.title,
					value: `[${musicService.session.queueable.title}](${musicService.session.queueable.url})`,
					inline: false,
				},
				{
					name: strings.requestedBy,
					value: mention(musicService.session.current.userId, { type: "user" }),
					inline: false,
				},
				{
					name: strings.runningTime,
					value: strings.playingSince({
						relative_timestamp: timestamp(musicService.session.playingTimeMilliseconds, {
							format: "relative",
						}),
					}),
					inline: false,
				},
			],
			footer: {
				text: strings.sourcedFrom({ source: musicService.session.current.source ?? strings.theInternet }),
			},
		},
		{ visible: interaction.parameters.show },
	);
}

export { handleDisplayCurrentlyPlaying };
