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
import { getVoiceState, isCollection, isOccupied, skip, verifyVoiceState } from 'logos/src/controllers/music.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.skip),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleSkipAction,
	options: [collection, by, to],
};

function handleSkipAction([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyVoiceState(
		bot,
		interaction,
		controller,
		getVoiceState(client, interaction),
		'manipulate',
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

	if (!isOccupied(controller.player) || controller.currentListing === undefined) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.options.skip.strings.noSongToSkip, interaction.locale),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	if (collection !== undefined && !isCollection(controller.currentListing?.content)) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.options.skip.strings.noSongCollectionToSkip, interaction.locale),
						color: constants.colors.dullYellow,
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

	const isSkippingCollection = collection ?? false;

	if (by !== undefined) {
		let listingsToSkip!: number;
		if (isCollection(controller.currentListing?.content) && collection === undefined) {
			listingsToSkip = Math.min(
				by,
				controller.currentListing!.content.songs.length - (controller.currentListing!.content.position + 1),
			);
		} else {
			listingsToSkip = Math.min(by, controller.listingQueue.length);
		}
		skip(controller, isSkippingCollection, { by: listingsToSkip });
	} else if (to !== undefined) {
		let listingToSkipTo!: number;
		if (isCollection(controller.currentListing?.content) && collection === undefined) {
			listingToSkipTo = Math.min(to, controller.currentListing!.content.songs.length);
		} else {
			listingToSkipTo = Math.min(to, controller.listingQueue.length);
		}
		skip(controller, isSkippingCollection, { to: listingToSkipTo });
	} else {
		skip(controller, isSkippingCollection, {});
	}

	const messageLocalisations = (collection ?? false)
		? Commands.music.options.skip.strings.skippedSongCollection
		: Commands.music.options.skip.strings.skippedSong;

	const messageString = localise(messageLocalisations.header, defaultLocale);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `⏭️ ${messageString}`,
					description: localise(messageLocalisations.body, defaultLocale),
					color: constants.colors.invisible,
				}],
			},
		},
	);
}

export default command;
