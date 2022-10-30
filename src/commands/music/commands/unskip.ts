import { Commands } from '../../../../assets/localisations/commands.ts';
import { createLocalisations, localise } from '../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { defaultLanguage } from '../../../types.ts';
import { parseArguments } from '../../../utils.ts';
import { SongListingContentTypes } from '../data/song-listing.ts';
import { by, collection, to } from '../parameters.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.unskip),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: unskip,
	options: [collection, by, to],
};

function unskip(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _] = musicController.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	const data = interaction.data;
	if (!data) return;

	const [{ collection, by, to }] = parseArguments(interaction.data?.options, {
		collection: 'boolean',
		by: 'number',
		to: 'number',
	});

	if (by && isNaN(by)) return;
	if (to && isNaN(to)) return;

	const songListing = musicController.current;

	const isUnskippingListing = !songListing ||
		songListing.content.type !== SongListingContentTypes.Collection ||
		(songListing.content.type === SongListingContentTypes.Collection &&
			(collection || songListing.content.position === 0));

	if (isUnskippingListing && musicController.history.length === 0) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(
							Commands.music.options.unskip.strings.nowhereToUnskipTo,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	if (
		collection &&
		songListing?.content.type !== SongListingContentTypes.Collection
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
						description: localise(
							Commands.music.options.unskip.strings.noSongCollectionToUnskip,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	if (musicController.isOccupied && !musicController.canPushToQueue) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(
							Commands.music.options.unskip.strings.cannotUnskipDueToFullQueue,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	if (by && to) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(
							Commands.music.strings.tooManySkipArguments,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	if ((by && by <= 0) || (to && to <= 0)) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(
							Commands.music.strings.mustBeGreaterThanZero,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	if (isUnskippingListing) {
		musicController.unskip(collection, {
			by: by,
			to: to,
		});
	} else {
		if (by) {
			if (
				songListing.content.type === SongListingContentTypes.Collection &&
				!collection
			) {
				const listingToUnskip = Math.min(by, songListing.content.position);

				musicController.unskip(collection, {
					by: listingToUnskip,
					to: undefined,
				});
			} else {
				const listingsToUnskip = Math.min(by, musicController.history.length);

				musicController.unskip(collection, {
					by: listingsToUnskip,
					to: undefined,
				});
			}
		} else if (to) {
			if (
				songListing.content.type === SongListingContentTypes.Collection &&
				!collection
			) {
				const listingToSkipTo = Math.max(to, 1);

				musicController.unskip(collection, {
					by: undefined,
					to: listingToSkipTo,
				});
			} else {
				const listingToSkipTo = Math.min(to, musicController.history.length);

				musicController.unskip(collection, {
					by: undefined,
					to: listingToSkipTo,
				});
			}
		} else {
			musicController.unskip(collection, {
				by: undefined,
				to: undefined,
			});
		}
	}

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `⏮️ ${
						localise(
							Commands.music.options.unskip.strings.unskipped.header,
							defaultLanguage,
						)
					}`,
					description: localise(
						Commands.music.options.unskip.strings.unskipped.body,
						defaultLanguage,
					),
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export default command;
