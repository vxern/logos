import type { Client } from "logos/client";
import { SongCollection } from "logos/services/music";

async function handleSkipAction(
	client: Client,
	interaction: Logos.Interaction<
		any,
		{ collection: boolean | undefined; by: number | undefined; to: number | undefined }
	>,
): Promise<void> {
	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canManagePlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const strings = constants.contexts.noSongToSkip({
			localise: client.localise.bind(client),
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
			const strings = constants.contexts.noSongCollectionToSkip({
				localise: client.localise.bind(client),
				locale: interaction.locale,
			});

			await client.warning(interaction, {
				title: strings.title,
				description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
			});

			return;
		}
	}

	// If both the 'to' and the 'by' parameter have been supplied.
	if (interaction.parameters.by !== undefined && interaction.parameters.to !== undefined) {
		const strings = constants.contexts.tooManySkipArguments({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	// If either the 'to' parameter or the 'by' parameter are negative.
	if (
		(interaction.parameters.by !== undefined && interaction.parameters.by <= 0) ||
		(interaction.parameters.to !== undefined && interaction.parameters.to <= 0)
	) {
		const strings = constants.contexts.invalidSkipArgument({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.error(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const isSkippingCollection = interaction.parameters.collection ?? false;

	let strings: { title: string; description: string };
	if (isSkippingCollection) {
		strings = constants.contexts.skippedSongCollection({
			localise: client.localise.bind(client),
			locale: interaction.guildLocale,
		});
	} else {
		strings = constants.contexts.skippedSong({
			localise: client.localise.bind(client),
			locale: interaction.guildLocale,
		});
	}

	await client.success(
		interaction,
		{
			title: `${constants.emojis.music.skipped} ${strings.title}`,
			description: strings.description,
		},
		{ visible: true },
	);

	await musicService.session.skip({
		mode: interaction.parameters.collection ? "song-collection" : "playable",
		controls: { by: interaction.parameters.by, to: interaction.parameters.to },
	});
}

export { handleSkipAction };