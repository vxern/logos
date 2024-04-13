import { Client } from "logos/client";
import { SongCollection } from "logos/services/music";

async function handleLoopPlayback(
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
			title: client.localise("music.options.loop.strings.noSong.title", locale)(),
			description: client.localise("music.options.loop.strings.noSong.description", locale)(),
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (interaction.parameters.collection) {
		if (!(musicService.session.queueable instanceof SongCollection)) {
			const locale = interaction.locale;
			const strings = {
				title: client.localise("music.options.loop.strings.noSongCollection.title", locale)(),
				description: {
					noSongCollection: client.localise(
						"music.options.loop.strings.noSongCollection.description.noSongCollection",
						locale,
					)(),
					trySongInstead: client.localise(
						"music.options.loop.strings.noSongCollection.description.trySongInstead",
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

	if (interaction.parameters.collection) {
		musicService.session.setLoop(!musicService.session.queueable.isLooping, { mode: "song-collection" });
	} else {
		musicService.session.setLoop(!musicService.session.playable.isLooping, { mode: "playable" });
	}

	if (interaction.parameters.collection) {
		if (!musicService.session.queueable.isLooping) {
			const strings = {
				title: client.localise("music.options.loop.strings.disabled.title", locale)(),
				description: client.localise("music.options.loop.strings.disabled.description.songCollection", locale)(),
			};

			await client.success(
				interaction,
				{
					title: `${constants.emojis.music.loopDisabled} ${strings.title}`,
					description: strings.description,
				},
				{ visible: true },
			);

			return;
		}

		const strings = {
			title: client.localise("music.options.loop.strings.enabled.title", locale)(),
			description: client.localise("music.options.loop.strings.enabled.description.songCollection", locale)(),
		};

		await client.success(
			interaction,
			{
				title: `${constants.emojis.music.loopEnabled} ${strings.title}`,
				description: strings.description,
			},
			{ visible: true },
		);

		return;
	}

	if (!musicService.session.playable.isLooping) {
		const strings = {
			title: client.localise("music.options.loop.strings.disabled.title", locale)(),
			description: client.localise("music.options.loop.strings.disabled.description.song", locale)(),
		};

		await client.success(
			interaction,
			{
				title: `${constants.emojis.music.loopDisabled} ${strings.title}`,
				description: strings.description,
			},
			{ visible: true },
		);

		return;
	}

	const strings = {
		title: client.localise("music.options.loop.strings.enabled.title", locale)(),
		description: client.localise("music.options.loop.strings.enabled.description.song", locale)(),
	};

	await client.success(
		interaction,
		{
			title: `${constants.emojis.music.loopEnabled} ${strings.title}`,
			description: strings.description,
		},
		{ visible: true },
	);
}

export { handleLoopPlayback };
