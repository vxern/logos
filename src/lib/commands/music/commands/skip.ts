import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { parseArguments, reply } from "../../../interactions.js";
import { isCollection } from "../../../services/music/music.js";
import { OptionTemplate } from "../../command.js";
import { by, collection, to } from "../../parameters.js";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "skip",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleSkipAction,
	options: [collection, by, to],
};

async function handleSkipAction([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<void> {
	const [{ collection, by: songsToSkip, to: songToSkipTo }] = parseArguments(interaction.data?.options, {
		collection: "boolean",
		by: "number",
		to: "number",
	});
	if (songsToSkip !== undefined && isNaN(songsToSkip)) {
		return;
	}
	if (songToSkipTo !== undefined && isNaN(songToSkipTo)) {
		return;
	}

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.services.music.music.get(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(bot, interaction);
	if (isVoiceStateVerified === undefined || !isVoiceStateVerified) {
		return;
	}

	const [isOccupied, current, queue] = [musicService.isOccupied, musicService.current, musicService.queue];
	if (isOccupied === undefined || queue === undefined) {
		return;
	}

	if (collection) {
		if (!isOccupied || current === undefined) {
			const strings = {
				title: localise(client, "music.options.skip.strings.noSongCollection.title", interaction.locale)(),
				description: {
					noSongCollection: localise(
						client,
						"music.options.skip.strings.noSongCollection.description.noSongCollection",
						interaction.locale,
					)(),
				},
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description.noSongCollection,
						color: constants.colors.dullYellow,
					},
				],
			});
			return;
		} else if (!isCollection(current.content)) {
			const strings = {
				title: localise(client, "music.options.skip.strings.noSongCollection.title", interaction.locale)(),
				description: {
					noSongCollection: localise(
						client,
						"music.options.skip.strings.noSongCollection.description.noSongCollection",
						interaction.locale,
					)(),
					trySongInstead: localise(
						client,
						"music.options.skip.strings.noSongCollection.description.trySongInstead",
						interaction.locale,
					)(),
				},
			};

			reply([client, bot], interaction, {
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
	} else {
		if (!isOccupied || current === undefined) {
			const strings = {
				title: localise(client, "music.options.skip.strings.noSong.title", interaction.locale)(),
				description: localise(client, "music.options.skip.strings.noSong.description", interaction.locale)(),
			};

			reply([client, bot], interaction, {
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
	}

	// If both the 'to' and the 'by' parameter have been supplied.
	if (songsToSkip !== undefined && songToSkipTo !== undefined) {
		const strings = {
			title: localise(client, "music.strings.skips.tooManyArguments.title", interaction.locale)(),
			description: localise(client, "music.strings.skips.tooManyArguments.description", interaction.locale)(),
		};

		reply([client, bot], interaction, {
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
	if ((songsToSkip !== undefined && songsToSkip <= 0) || (songToSkipTo !== undefined && songToSkipTo <= 0)) {
		const strings = {
			title: localise(client, "music.strings.skips.invalid.title", interaction.locale)(),
			description: localise(client, "music.strings.skips.invalid.description", interaction.locale)(),
		};

		reply([client, bot], interaction, {
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

	const isSkippingCollection = collection ?? false;

	if (songsToSkip !== undefined) {
		let listingsToSkip!: number;
		if (isCollection(current.content) && collection === undefined) {
			listingsToSkip = Math.min(songsToSkip, current.content.songs.length - (current.content.position + 1));
		} else {
			listingsToSkip = Math.min(songsToSkip, queue.length);
		}
		musicService.skip(isSkippingCollection, { by: listingsToSkip });
	} else if (songToSkipTo !== undefined) {
		let listingToSkipTo!: number;
		if (isCollection(current.content) && collection === undefined) {
			listingToSkipTo = Math.min(songToSkipTo, current.content.songs.length);
		} else {
			listingToSkipTo = Math.min(songToSkipTo, queue.length);
		}
		musicService.skip(isSkippingCollection, { to: listingToSkipTo });
	} else {
		musicService.skip(isSkippingCollection, {});
	}

	const strings =
		collection ?? false
			? {
					title: localise(client, "music.options.skip.strings.skippedSongCollection.title", defaultLocale)(),
					description: localise(
						client,
						"music.options.skip.strings.skippedSongCollection.description",
						defaultLocale,
					)(),
			  }
			: {
					title: localise(client, "music.options.skip.strings.skippedSong.title", defaultLocale)(),
					description: localise(client, "music.options.skip.strings.skippedSong.description", defaultLocale)(),
			  };

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.skipped} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);
}

export default command;
