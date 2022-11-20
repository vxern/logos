import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from '../../../../assets/localisations/mod.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { defaultLanguage } from '../../../types.ts';
import { parseArguments } from '../../../utils.ts';
import { SongListingContentTypes } from '../data/song-listing.ts';
import { by, collection, to } from '../parameters.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.skip),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: skipSong,
	options: [collection, by, to],
};

function skipSong(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _voiceState] = musicController.verifyMemberVoiceState(
		interaction,
	);
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

	if (!musicController.isOccupied || !songListing) {
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
							Commands.music.options.skip.strings.noSongToSkip,
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
		songListing.content.type !== SongListingContentTypes.Collection
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
							Commands.music.options.skip.strings.noSongCollectionToSkip,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
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

	if (by) {
		if (
			songListing.content.type === SongListingContentTypes.Collection &&
			!collection
		) {
			const listingsToSkip = Math.min(
				by,
				songListing.content.songs.length -
					(songListing.content.position + 1),
			);

			musicController.skip(collection, {
				by: listingsToSkip,
				to: undefined,
			});
		} else {
			const listingsToSkip = Math.min(by, musicController.queue.length);

			musicController.skip(collection, {
				by: listingsToSkip,
				to: undefined,
			});
		}
	} else if (to) {
		if (
			songListing.content.type === SongListingContentTypes.Collection &&
			!collection
		) {
			const listingToSkipTo = Math.min(to, songListing.content.songs.length);

			musicController.skip(collection, {
				by: undefined,
				to: listingToSkipTo,
			});
		} else {
			const listingToSkipTo = Math.min(to, musicController.queue.length);

			musicController.skip(collection, {
				by: undefined,
				to: listingToSkipTo,
			});
		}
	} else {
		musicController.skip(collection, {
			by: undefined,
			to: undefined,
		});
	}

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `⏭️ ${
						localise(
							Commands.music.options.skip.strings.skipped.header,
							defaultLanguage,
						)
					}`,
					description: localise(
						Commands.music.options.skip.strings.skipped.body,
						defaultLanguage,
					)(collection ?? false),
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export default command;
