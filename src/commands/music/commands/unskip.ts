import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { OptionTemplate } from 'logos/src/commands/command.ts';
import { by, collection, to } from 'logos/src/commands/parameters.ts';
import {
	getVoiceState,
	isCollection,
	isOccupied,
	isQueueVacant,
	unskip,
	verifyCanManagePlayback,
} from 'logos/src/controllers/music.ts';
import { Client, localise } from 'logos/src/client.ts';
import { parseArguments, reply } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionTemplate = {
	name: 'unskip',
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleUnskipAction,
	options: [collection, by, to],
};

function handleUnskipAction([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ collection, by: songsToUnskip, to: songToUnskipTo }] = parseArguments(
		interaction.data?.options,
		{ collection: 'boolean', by: 'number', to: 'number' },
	);

	if (songsToUnskip !== undefined && isNaN(songsToUnskip)) return;
	if (songToUnskipTo !== undefined && isNaN(songToUnskipTo)) return;

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) return;

	const isUnskippingListing = (() => {
		if (controller.currentListing === undefined) return true;
		if (!isCollection(controller.currentListing?.content)) return true;
		if (collection !== undefined || controller.currentListing!.content.position === 0) return true;

		return false;
	})();

	if (isUnskippingListing && controller.listingHistory.length === 0) {
		const strings = {
			title: localise(client, 'music.options.unskip.strings.historyEmpty.title', interaction.locale)(),
			description: localise(client, 'music.options.unskip.strings.historyEmpty.description', interaction.locale)(),
		};

		return void reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});
	}

	if (
		collection !== undefined &&
		(controller.currentListing?.content === undefined || !isCollection(controller.currentListing?.content))
	) {
		const strings = {
			title: localise(client, 'music.options.unskip.strings.noSongCollection.title', interaction.locale)(),
			description: {
				noSongCollection: localise(
					client,
					'music.options.unskip.strings.noSongCollection.description.noSongCollection',
					interaction.locale,
				)(),
				trySongInstead: localise(
					client,
					'music.options.unskip.strings.noSongCollection.description.trySongInstead',
					interaction.locale,
				)(),
			},
		};

		return void reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
				color: constants.colors.dullYellow,
			}],
		});
	}

	if (isOccupied(controller.player) && !isQueueVacant(controller.listingQueue)) {
		const strings = {
			title: localise(client, 'music.options.unskip.strings.queueFull.title', interaction.locale)(),
			description: localise(client, 'music.options.unskip.strings.queueFull.description', interaction.locale)(),
		};

		return void reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});
	}

	// If both the 'to' and the 'by' parameter have been supplied.
	if (songsToUnskip !== undefined && songToUnskipTo !== undefined) {
		const strings = {
			title: localise(client, 'music.strings.skips.tooManyArguments.title', interaction.locale)(),
			description: localise(client, 'music.strings.skips.tooManyArguments.description', interaction.locale)(),
		};

		return void reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.yellow,
			}],
		});
	}

	// If either the 'to' parameter or the 'by' parameter are negative.
	if ((songsToUnskip !== undefined && songsToUnskip <= 0) || (songToUnskipTo !== undefined && songToUnskipTo <= 0)) {
		const strings = {
			title: localise(client, 'music.strings.skips.invalid.title', interaction.locale)(),
			description: localise(client, 'music.strings.skips.invalid.description', interaction.locale)(),
		};

		return void reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			}],
		});
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
				controller.currentListing?.content !== undefined && isCollection(controller.currentListing.content) &&
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
				controller.currentListing?.content !== undefined && isCollection(controller.currentListing.content) &&
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
		title: localise(client, 'music.options.unskip.strings.unskipped.title', defaultLocale)(),
		description: localise(client, 'music.options.unskip.strings.unskipped.description', defaultLocale)(),
	};

	return void reply([client, bot], interaction, {
		embeds: [{
			title: `${constants.symbols.music.unskipped} ${strings.title}`,
			description: strings.description,
			color: constants.colors.blue,
		}],
	}, { visible: true });
}

export default command;
