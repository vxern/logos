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
		const strings = constants.contexts.noSongToLoop({ localise: client.localise, locale: interaction.locale });

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (interaction.parameters.collection) {
		if (!(musicService.session.queueable instanceof SongCollection)) {
			const strings = constants.contexts.noSongCollectionToLoop({ localise: client.localise, locale: interaction.locale });

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
			const strings = constants.contexts.loopDisabledForSongCollection({ localise: client.localise, locale });

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

		const strings = constants.contexts.loopEnabledForSongCollection({ localise: client.localise, locale });

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
		const strings = constants.contexts.loopDisabledForSong({ localise: client.localise, locale });

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

	const strings = constants.contexts.loopEnabledForSong({ localise: client.localise, locale });

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
