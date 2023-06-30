import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { getVoiceState, isCollection, isOccupied, skip, verifyCanManagePlayback } from "../../../controllers/music.js";
import { parseArguments, reply } from "../../../interactions.js";
import { OptionTemplate } from "../../command.js";
import { by, collection, to } from "../../parameters.js";
import { ApplicationCommandOptionTypes, Bot, Interaction } from "discordeno";

const command: OptionTemplate = {
	name: "skip",
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleSkipAction,
	options: [collection, by, to],
};

async function handleSkipAction([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
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

	const controller = client.features.music.controllers.get(guildId);
	if (controller === undefined) {
		return;
	}

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, guildId, interaction.user.id),
	);
	if (!isVoiceStateVerified) {
		return;
	}

	const currentListing = controller.currentListing;

	if (collection) {
		if (!isOccupied(controller.player) || currentListing === undefined) {
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
		} else if (!isCollection(currentListing.content)) {
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
		if (!isOccupied(controller.player) || currentListing === undefined) {
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
		if (isCollection(currentListing.content) && collection === undefined) {
			listingsToSkip = Math.min(
				songsToSkip,
				currentListing.content.songs.length - (currentListing.content.position + 1),
			);
		} else {
			listingsToSkip = Math.min(songsToSkip, controller.listingQueue.length);
		}
		skip(controller, isSkippingCollection, { by: listingsToSkip });
	} else if (songToSkipTo !== undefined) {
		let listingToSkipTo!: number;
		if (isCollection(currentListing.content) && collection === undefined) {
			listingToSkipTo = Math.min(songToSkipTo, currentListing.content.songs.length);
		} else {
			listingToSkipTo = Math.min(songToSkipTo, controller.listingQueue.length);
		}
		skip(controller, isSkippingCollection, { to: listingToSkipTo });
	} else {
		skip(controller, isSkippingCollection, {});
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
