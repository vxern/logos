import { Client } from "logos/client";
import { SongCollection } from "logos/services/music";

async function handleUnskipAction(
	client: Client,
	interaction: Logos.Interaction<
		any,
		{ collection: boolean | undefined; by: number | undefined; to: number | undefined }
	>,
): Promise<void> {
	if (interaction.parameters.by !== undefined && !Number.isSafeInteger(interaction.parameters.by)) {
		return;
	}

	if (interaction.parameters.to !== undefined && !Number.isSafeInteger(interaction.parameters.to)) {
		return;
	}

	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canManagePlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const strings = constants.contexts.notPlayingMusicToManage({ localise: client.localise, locale: interaction.locale });

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const isUnskippingListing = (() => {
		if (!musicService.session.hasCurrent) {
			return true;
		}

		if (!(musicService.session.queueable instanceof SongCollection)) {
			return true;
		}

		if (interaction.parameters.collection || musicService.session.queueable.index === 0) {
			return true;
		}

		return false;
	})();

	if (isUnskippingListing && musicService.session.listings.history.isEmpty) {
		const strings = constants.contexts.unskipHistoryEmpty({ localise: client.localise, locale: interaction.locale });

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (musicService.session.listings.queue.isFull) {
		const strings = constants.contexts.unskipQueueFull({ localise: client.localise, locale: interaction.locale });

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (interaction.parameters.collection !== undefined && !(musicService.session.queueable instanceof SongCollection)) {
		const strings = constants.contexts.noSongCollectionToUnskip({ localise: client.localise, locale: interaction.locale });

		await client.warning(interaction, {
			title: strings.title,
			description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
		});

		return;
	}

	// If both the 'to' and the 'by' parameter have been supplied.
	if (interaction.parameters.by !== undefined && interaction.parameters.to !== undefined) {
		const strings = constants.contexts.tooManyUnskipArguments({ localise: client.localise, locale: interaction.locale });

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
		const strings = constants.contexts.invalidSkipArgument({ localise: client.localise, locale: interaction.locale });

		await client.error(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const strings = constants.contexts.invalidSkipArgument({ localise: client.localise, locale: interaction.guildLocale });

	await client.success(
		interaction,
		{
			title: `${constants.emojis.music.unskipped} ${strings.title}`,
			description: strings.description,
		},
		{ visible: true },
	);

	await musicService.session.unskip({
		mode: interaction.parameters.collection ? "song-collection" : "playable",
		controls: { by: interaction.parameters.by, to: interaction.parameters.to },
	});
}

export { handleUnskipAction };
