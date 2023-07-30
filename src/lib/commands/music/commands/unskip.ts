import constants from "../../../../constants/constants";
import { defaultLocale } from "../../../../constants/language";
import { Client, localise } from "../../../client";
import { parseArguments, reply } from "../../../interactions";
import { isCollection } from "../../../services/music/music";
import { OptionTemplate } from "../../command";
import { by, collection, to } from "../../parameters";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "unskip",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleUnskipAction,
	options: [collection, by, to],
};

async function handleUnskipAction(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ collection, by: songsToUnskip, to: songToUnskipTo }] = parseArguments(interaction.data?.options, {
		collection: "boolean",
		by: "number",
		to: "number",
	});

	if (songsToUnskip !== undefined && !Number.isSafeInteger(songsToUnskip)) {
		return;
	}
	if (songToUnskipTo !== undefined && !Number.isSafeInteger(songToUnskipTo)) {
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
	if (!isVoiceStateVerified) {
		return;
	}

	const isOccupied = musicService.isOccupied;
	if (!isOccupied) {
		const strings = {
			title: localise(client, "music.strings.notPlaying.title", interaction.locale)(),
			description: {
				toManage: localise(client, "music.strings.notPlaying.description.toManage", interaction.locale)(),
			},
		};

		reply([client, bot], interaction, {
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

	const [history, current, isQueueVacant, isHistoryEmpty] = [
		musicService.history,
		musicService.current,
		musicService.isQueueVacant,
		musicService.isHistoryEmpty,
	];
	if (history === undefined || isQueueVacant === undefined || isHistoryEmpty === undefined) {
		return;
	}

	const isUnskippingListing = (() => {
		if (current === undefined) {
			return true;
		}
		if (!isCollection(current.content)) {
			return true;
		}
		if (collection !== undefined || current.content.position === 0) {
			return true;
		}

		return false;
	})();

	if (isUnskippingListing && isHistoryEmpty) {
		const strings = {
			title: localise(client, "music.options.unskip.strings.historyEmpty.title", interaction.locale)(),
			description: localise(client, "music.options.unskip.strings.historyEmpty.description", interaction.locale)(),
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

	if (
		collection !== undefined &&
		(current === undefined || current.content === undefined || !isCollection(current.content))
	) {
		const strings = {
			title: localise(client, "music.options.unskip.strings.noSongCollection.title", interaction.locale)(),
			description: {
				noSongCollection: localise(
					client,
					"music.options.unskip.strings.noSongCollection.description.noSongCollection",
					interaction.locale,
				)(),
				trySongInstead: localise(
					client,
					"music.options.unskip.strings.noSongCollection.description.trySongInstead",
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

	if (!isQueueVacant) {
		const strings = {
			title: localise(client, "music.options.unskip.strings.queueFull.title", interaction.locale)(),
			description: localise(client, "music.options.unskip.strings.queueFull.description", interaction.locale)(),
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

	// If both the 'to' and the 'by' parameter have been supplied.
	if (songsToUnskip !== undefined && songToUnskipTo !== undefined) {
		const strings = {
			title: localise(client, "music.strings.skips.tooManyArguments.title", interaction.locale)(),
			description: localise(client, "music.strings.skips.tooManyArguments.description", interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.yellow,
				},
			],
		});
		return;
	}

	// If either the 'to' parameter or the 'by' parameter are negative.
	if ((songsToUnskip !== undefined && songsToUnskip <= 0) || (songToUnskipTo !== undefined && songToUnskipTo <= 0)) {
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

	const isUnskippingCollection = collection ?? false;

	if (isUnskippingListing) {
		musicService.unskip(bot, isUnskippingCollection, { by: songsToUnskip, to: songToUnskipTo });
	} else {
		if (songsToUnskip !== undefined) {
			let listingsToUnskip!: number;
			if (
				current !== undefined &&
				current.content !== undefined &&
				isCollection(current.content) &&
				collection === undefined
			) {
				listingsToUnskip = Math.min(songsToUnskip, current.content.position);
			} else {
				listingsToUnskip = Math.min(songsToUnskip, history.length);
			}
			musicService.unskip(bot, isUnskippingCollection, { by: listingsToUnskip });
		} else if (songToUnskipTo !== undefined) {
			let listingToSkipTo!: number;
			if (
				current !== undefined &&
				current.content !== undefined &&
				isCollection(current.content) &&
				collection === undefined
			) {
				listingToSkipTo = Math.max(songToUnskipTo, 1);
			} else {
				listingToSkipTo = Math.min(songToUnskipTo, history.length);
			}
			musicService.unskip(bot, isUnskippingCollection, { to: listingToSkipTo });
		} else {
			musicService.unskip(bot, isUnskippingCollection, {});
		}
	}

	const strings = {
		title: localise(client, "music.options.unskip.strings.unskipped.title", defaultLocale)(),
		description: localise(client, "music.options.unskip.strings.unskipped.description", defaultLocale)(),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.unskipped} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);
}

export default command;
