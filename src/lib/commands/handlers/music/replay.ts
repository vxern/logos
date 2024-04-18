import { Client } from "logos/client";
import { SongCollection } from "logos/services/music";

async function handleReplayAction(
	client: Client,
	interaction: Logos.Interaction<any, { collection: boolean | undefined }>,
): Promise<void> {
	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canManagePlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const strings = constants.contexts.noSongToReplay({ localise: client.localise, locale: interaction.locale });

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (interaction.parameters.collection) {
		if (!(musicService.session.queueable instanceof SongCollection)) {
			const strings = constants.contexts.noSongCollectionToReplay({ localise: client.localise, locale: interaction.locale });

			await client.warning(interaction, {
				title: strings.title,
				description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
			});

			return;
		}
	}

	const strings = constants.contexts.replaying({ localise: client.localise, locale: interaction.guildLocale });

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
