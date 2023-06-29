import { ApplicationCommandOptionTypes, Bot, Interaction } from "discordeno";
import { OptionTemplate } from "../../command.js";
import { by, collection, to } from "../../parameters.js";
import {
	getVoiceState,
	isCollection,
	isOccupied,
	isQueueVacant,
	unskip,
	verifyCanManagePlayback,
} from "../../../controllers/music.js";
import { Client, localise } from "../../../client.js";
import { parseArguments, reply } from "../../../interactions.js";
import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";

const command: OptionTemplate = {
	name: "unskip",
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleUnskipAction,
	options: [collection, by, to],
};

async function handleUnskipAction([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ collection, by: songsToUnskip, to: songToUnskipTo }] = parseArguments(interaction.data?.options, {
		collection: "boolean",
		by: "number",
		to: "number",
	});

	if (songsToUnskip !== undefined && isNaN(songsToUnskip)) {
		return;
	}
	if (songToUnskipTo !== undefined && isNaN(songToUnskipTo)) {
		return;
	}

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) {
		return;
	}

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) {
		return;
	}

	const isUnskippingListing = (() => {
		if (controller.currentListing === undefined) {
			return true;
		}
		if (!isCollection(controller.currentListing?.content)) {
			return true;
		}
		if (collection !== undefined || controller.currentListing!.content.position === 0) {
			return true;
		}

		return false;
	})();

	if (isUnskippingListing && controller.listingHistory.length === 0) {
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
		(controller.currentListing?.content === undefined || !isCollection(controller.currentListing?.content))
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

	if (isOccupied(controller.player) && !isQueueVacant(controller.listingQueue)) {
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
		unskip([client, bot], interaction.guildId!, controller, isUnskippingCollection, {
			by: songsToUnskip,
			to: songToUnskipTo,
		});
	} else {
		if (songsToUnskip !== undefined) {
			let listingsToUnskip!: number;
			if (
				controller.currentListing?.content !== undefined &&
				isCollection(controller.currentListing.content) &&
				collection === undefined
			) {
				listingsToUnskip = Math.min(songsToUnskip, controller.currentListing!.content.position);
			} else {
				listingsToUnskip = Math.min(songsToUnskip, controller.listingHistory.length);
			}
			unskip([client, bot], interaction.guildId!, controller, isUnskippingCollection, { by: listingsToUnskip });
		} else if (songToUnskipTo !== undefined) {
			let listingToSkipTo!: number;
			if (
				controller.currentListing?.content !== undefined &&
				isCollection(controller.currentListing.content) &&
				collection === undefined
			) {
				listingToSkipTo = Math.max(songToUnskipTo, 1);
			} else {
				listingToSkipTo = Math.min(songToUnskipTo, controller.listingHistory.length);
			}
			unskip([client, bot], interaction.guildId!, controller, isUnskippingCollection, { to: listingToSkipTo });
		} else {
			unskip([client, bot], interaction.guildId!, controller, isUnskippingCollection, {});
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
