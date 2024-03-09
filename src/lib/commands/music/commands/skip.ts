import { Client } from "../../../client";
import { isCollection } from "../../../services/music/music";
import { OptionTemplate } from "../../command";
import { by, collection, to } from "../../parameters";

const command: OptionTemplate = {
	id: "skip",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleSkipAction,
	options: [collection, by, to],
};

async function handleSkipAction(
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

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.getMusicService(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(interaction);
	if (!isVoiceStateVerified) {
		return;
	}

	const [isOccupied, current, queue] = [musicService.isOccupied, musicService.current, musicService.queue];
	if (!isOccupied || current === undefined || queue === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.notPlaying.title", locale)(),
			description: {
				toManage: client.localise("music.strings.notPlaying.description.toManage", locale)(),
			},
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description.toManage,
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	if (interaction.parameters.collection) {
		if (current?.content === undefined || !isCollection(current.content)) {
			const locale = interaction.locale;
			const strings = {
				title: client.localise("music.options.skip.strings.noSongCollection.title", locale)(),
				description: {
					noSongCollection: client.localise(
						"music.options.skip.strings.noSongCollection.description.noSongCollection",
						locale,
					)(),
					trySongInstead: client.localise(
						"music.options.skip.strings.noSongCollection.description.trySongInstead",
						locale,
					)(),
				},
			};

			client.reply(interaction, {
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
	} else if (current?.content === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.skip.strings.noSong.title", locale)(),
			description: client.localise("music.options.skip.strings.noSong.description", locale)(),
		};

		client.reply(interaction, {
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

	// If both the 'to' and the 'by' parameter have been supplied.
	if (interaction.parameters.by !== undefined && interaction.parameters.to !== undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.skips.tooManyArguments.title", locale)(),
			description: client.localise("music.strings.skips.tooManyArguments.description", locale)(),
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
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

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});
		return;
	}

	const isSkippingCollection = interaction.parameters.collection ?? false;
	const strings = isSkippingCollection
		? {
				title: client.localise("music.options.skip.strings.skippedSongCollection.title", locale)(),
				description: client.localise("music.options.skip.strings.skippedSongCollection.description", locale)(),
		  }
		: {
				title: client.localise("music.options.skip.strings.skippedSong.title", locale)(),
				description: client.localise("music.options.skip.strings.skippedSong.description", locale)(),
		  };

	client.reply(
		interaction,
		{
			embeds: [
				{
					title: `${constants.emojis.music.skipped} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);

	if (interaction.parameters.by !== undefined) {
		let listingsToSkip!: number;
		if (isCollection(current.content) && interaction.parameters.collection === undefined) {
			listingsToSkip = Math.min(
				interaction.parameters.by,
				current.content.songs.length - (current.content.position + 1),
			);
		} else {
			listingsToSkip = Math.min(interaction.parameters.by, queue.length);
		}
		musicService.skip(isSkippingCollection, { by: listingsToSkip });
	} else if (interaction.parameters.to !== undefined) {
		let listingToSkipTo!: number;
		if (isCollection(current.content) && interaction.parameters.collection === undefined) {
			listingToSkipTo = Math.min(interaction.parameters.to, current.content.songs.length);
		} else {
			listingToSkipTo = Math.min(interaction.parameters.to, queue.length);
		}
		musicService.skip(isSkippingCollection, { to: listingToSkipTo });
	} else {
		musicService.skip(isSkippingCollection, {});
	}
}

export default command;
