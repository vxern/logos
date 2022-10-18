import { Commands } from '../../../../assets/localisations/commands.ts';
import {
	createLocalisations,
	localise,
} from '../../../../assets/localisations/types.ts';
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

	const unskipCollection =
		(<boolean | undefined> data.options?.at(0)?.options?.find((
			option,
		) => option.name === 'collection')?.value) ?? false;

	const byString = <string | undefined> data.options?.at(0)?.options?.find((
		option,
	) => option.name === 'by')?.value;
	const toString = <string | undefined> data.options?.at(0)?.options?.find((
		option,
	) => option.name === 'to')?.value;

	const by = byString ? Number(byString) : undefined;
	if (by && isNaN(by)) return;

	const to = toString ? Number(toString) : undefined;
	if (to && isNaN(to)) return;

	const songListing = musicController.current;

	const isUnskippingListing = !songListing ||
		songListing.content.type !== SongListingContentTypes.Collection ||
		(songListing.content.type === SongListingContentTypes.Collection &&
			(unskipCollection || songListing.content.position === 0));

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
		unskipCollection &&
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
		musicController.unskip(unskipCollection, {
			by: by,
			to: to,
		});
	} else {
		if (by) {
			if (
				songListing.content.type === SongListingContentTypes.Collection &&
				!unskipCollection
			) {
				const listingToUnskip = Math.min(by, songListing.content.position);

				musicController.unskip(unskipCollection, {
					by: listingToUnskip,
					to: undefined,
				});
			} else {
				const listingsToUnskip = Math.min(by, musicController.history.length);

				musicController.unskip(unskipCollection, {
					by: listingsToUnskip,
					to: undefined,
				});
			}
		} else if (to) {
			if (
				songListing.content.type === SongListingContentTypes.Collection &&
				!unskipCollection
			) {
				const listingToSkipTo = Math.max(to, 1);

				musicController.unskip(unskipCollection, {
					by: undefined,
					to: listingToSkipTo,
				});
			} else {
				const listingToSkipTo = Math.min(to, musicController.history.length);

				musicController.unskip(unskipCollection, {
					by: undefined,
					to: listingToSkipTo,
				});
			}
		} else {
			musicController.unskip(unskipCollection, {
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
