import { Client } from "logos/client";
import { SongCollection } from "logos/services/music";

async function handleReplayAction(
	client: Client,
	interaction: Logos.Interaction<any, { collection: boolean | undefined }>,
): Promise<void> {
	const locale = interaction.guildLocale;

	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canManagePlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.notPlaying.title", locale)(),
			description: {
				toManage: client.localise("music.strings.notPlaying.description.toManage", locale)(),
			},
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description.toManage,
		});

		return;
	}

	if (interaction.parameters.collection) {
		if (!(musicService.session.queueable instanceof SongCollection)) {
			const locale = interaction.locale;
			const strings = {
				title: client.localise("music.options.replay.strings.noSongCollection.title", locale)(),
				description: {
					noSongCollection: client.localise(
						"music.options.replay.strings.noSongCollection.description.noSongCollection",
						locale,
					)(),
					trySongInstead: client.localise(
						"music.options.replay.strings.noSongCollection.description.trySongInstead",
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
			title: client.localise("music.options.replay.strings.noSong.title", locale)(),
			description: client.localise("music.options.replay.strings.noSong.description", locale)(),
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}*/

	const strings = {
		title: client.localise("music.options.replay.strings.replaying.title", locale)(),
		description: client.localise("music.options.replay.strings.replaying.description", locale)(),
	};

	await client.success(
		interaction,
		{
			title: `${constants.emojis.music.replaying} ${strings.title}`,
			description: strings.description,
		},
		{ visible: true },
	);

	await musicService.session.replay({
		mode: interaction.parameters.collection ?? false ? "song-collection" : "playable",
	});
}

export { handleReplayAction };
