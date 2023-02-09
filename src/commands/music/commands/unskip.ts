import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { by, collection, to } from 'logos/src/commands/parameters.ts';
import {
	getVoiceState,
	isCollection,
	isOccupied,
	isQueueVacant,
	unskip,
	verifyCanManipulatePlayback,
} from 'logos/src/controllers/music.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.unskip),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleUnskipAction,
	options: [collection, by, to],
};

function handleUnskipAction([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyCanManipulatePlayback(
		bot,
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) return;

	const data = interaction.data;
	if (data === undefined) return;

	const [{ collection, by, to }] = parseArguments(interaction.data?.options, {
		collection: 'boolean',
		by: 'number',
		to: 'number',
	});

	if (by !== undefined && isNaN(by)) return;
	if (to !== undefined && isNaN(to)) return;

	const isUnskippingListing = (() => {
		if (controller.currentListing === undefined) return true;
		if (!isCollection(controller.currentListing?.content)) return true;
		if (collection !== undefined || controller.currentListing!.content.position === 0) return true;

		return false;
	})();

	if (isUnskippingListing && controller.listingHistory.length === 0) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.options.unskip.strings.nowhereToUnskipTo, interaction.locale),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	if (
		collection !== undefined &&
		(controller.currentListing?.content === undefined || !isCollection(controller.currentListing?.content))
	) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.options.unskip.strings.noSongCollectionToUnskip, interaction.locale),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	if (isOccupied(controller.player) && !isQueueVacant(controller.listingQueue)) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.options.unskip.strings.cannotUnskipDueToFullQueue, interaction.locale),
						color: constants.colors.red,
					}],
				},
			},
		);
	}

	if (by !== undefined && to !== undefined) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.strings.tooManySkipArguments, interaction.locale),
						color: constants.colors.red,
					}],
				},
			},
		);
	}

	if ((by !== undefined && by <= 0) || (to !== undefined && to <= 0)) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.strings.mustBeGreaterThanZero, interaction.locale),
						color: constants.colors.red,
					}],
				},
			},
		);
	}

	const isUnskippingCollection = collection ?? false;

	if (isUnskippingListing) {
		unskip([client, bot], interaction.guildId!, controller, isUnskippingCollection, { by: by, to: to });
	} else {
		if (by !== undefined) {
			let listingsToUnskip!: number;
			if (
				controller.currentListing?.content !== undefined && isCollection(controller.currentListing.content) &&
				collection === undefined
			) {
				listingsToUnskip = Math.min(by, controller.currentListing!.content.position);
			} else {
				listingsToUnskip = Math.min(by, controller.listingHistory.length);
			}
			unskip([client, bot], interaction.guildId!, controller, isUnskippingCollection, { by: listingsToUnskip });
		} else if (to !== undefined) {
			let listingToSkipTo!: number;
			if (
				controller.currentListing?.content !== undefined && isCollection(controller.currentListing.content) &&
				collection === undefined
			) {
				listingToSkipTo = Math.max(to, 1);
			} else {
				listingToSkipTo = Math.min(to, controller.listingHistory.length);
			}
			unskip([client, bot], interaction.guildId!, controller, isUnskippingCollection, { to: listingToSkipTo });
		} else {
			unskip([client, bot], interaction.guildId!, controller, isUnskippingCollection, {});
		}
	}

	const unskippedString = localise(Commands.music.options.unskip.strings.unskipped.header, defaultLocale);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `${constants.symbols.music.unskipped} ${unskippedString}`,
					description: localise(Commands.music.options.unskip.strings.unskipped.body, defaultLocale),
					color: constants.colors.invisible,
				}],
			},
		},
	);
}

export default command;
