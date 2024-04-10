import { isSongCollection } from "logos:constants/music";
import { Client } from "logos/client";

async function handleUnskipAction(
	client: Client,
	interaction: Logos.Interaction<
		any,
		{ collection: boolean | undefined; by: number | undefined; to: number | undefined }
	>,
): Promise<void> {
	const locale = interaction.guildLocale;

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

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(interaction);
	if (!isVoiceStateVerified) {
		return;
	}

	const isOccupied = musicService.isOccupied;
	if (!isOccupied) {
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

	const current = musicService.current;

	const isUnskippingListing = (() => {
		if (current === undefined) {
			return true;
		}

		if (!isSongCollection(current.content)) {
			return true;
		}

		if (interaction.parameters.collection !== undefined || current.content.position === 0) {
			return true;
		}

		return false;
	})();

	if (isUnskippingListing && musicService.session.listings.history.isEmpty) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.unskip.strings.historyEmpty.title", locale)(),
			description: client.localise("music.options.unskip.strings.historyEmpty.description", locale)(),
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (
		interaction.parameters.collection !== undefined &&
		(current === undefined || current.content === undefined || !isSongCollection(current.content))
	) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.unskip.strings.noSongCollection.title", locale)(),
			description: {
				noSongCollection: client.localise(
					"music.options.unskip.strings.noSongCollection.description.noSongCollection",
					locale,
				)(),
				trySongInstead: client.localise(
					"music.options.unskip.strings.noSongCollection.description.trySongInstead",
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

	if (musicService.session.listings.queue.isFull) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.unskip.strings.queueFull.title", locale)(),
			description: client.localise("music.options.unskip.strings.queueFull.description", locale)(),
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	// If both the 'to' and the 'by' parameter have been supplied.
	if (interaction.parameters.by !== undefined && interaction.parameters.to !== undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.skips.tooManyArguments.title", locale)(),
			description: client.localise("music.strings.skips.tooManyArguments.description", locale)(),
		};

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
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.skips.invalid.title", locale)(),
			description: client.localise("music.strings.skips.invalid.description", locale)(),
		};

		await client.error(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const strings = {
		title: client.localise("music.options.unskip.strings.unskipped.title", locale)(),
		description: client.localise("music.options.unskip.strings.unskipped.description", locale)(),
	};

	await client.success(
		interaction,
		{
			title: `${constants.emojis.music.unskipped} ${strings.title}`,
			description: strings.description,
		},
		{ visible: true },
	);

	const isUnskippingCollection = interaction.parameters.collection ?? false;

	if (isUnskippingListing) {
		await musicService.session.unskip(isUnskippingCollection, {
			by: interaction.parameters.by,
			to: interaction.parameters.to,
		});
	} else {
		if (interaction.parameters.by !== undefined) {
			let listingsToUnskip!: number;
			if (
				current !== undefined &&
				current.content !== undefined &&
				isSongCollection(current.content) &&
				interaction.parameters.collection === undefined
			) {
				listingsToUnskip = Math.min(interaction.parameters.by, current.content.position);
			} else {
				listingsToUnskip = Math.min(interaction.parameters.by, musicService.session.listings.history.count);
			}
			await musicService.session.unskip(isUnskippingCollection, { by: listingsToUnskip });
		} else if (interaction.parameters.to !== undefined) {
			let listingToSkipTo!: number;
			if (
				current !== undefined &&
				current.content !== undefined &&
				isSongCollection(current.content) &&
				interaction.parameters.collection === undefined
			) {
				listingToSkipTo = Math.max(interaction.parameters.to, 1);
			} else {
				listingToSkipTo = Math.min(interaction.parameters.to, musicService.session.listings.history.count);
			}
			await musicService.session.unskip(isUnskippingCollection, { to: listingToSkipTo });
		} else {
			await musicService.session.unskip(isUnskippingCollection, {});
		}
	}
}

export { handleUnskipAction };
