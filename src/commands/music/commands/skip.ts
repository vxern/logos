import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { SongListingContentTypes } from 'logos/src/commands/music/data/types.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { by, collection, to } from 'logos/src/commands/parameters.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { defaultLanguage } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.skip),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleSkipAction,
	options: [collection, by, to],
};

function handleSkipAction(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (musicController === undefined) return;

	const [canAct, _voiceState] = musicController.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	const data = interaction.data;
	if (data === undefined) return;

	const [{ collection, by, to }] = parseArguments(interaction.data?.options, {
		collection: 'boolean',
		by: 'number',
		to: 'number',
	});

	if (by !== undefined && isNaN(by)) return;
	if (to !== undefined && isNaN(to)) return;

	const songListing = musicController.current;

	if (!musicController.isOccupied || songListing === undefined) {
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
		collection !== undefined &&
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

	if (by !== undefined) {
		if (
			songListing.content.type === SongListingContentTypes.Collection &&
			collection === undefined
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
	} else if (to !== undefined) {
		if (
			songListing.content.type === SongListingContentTypes.Collection &&
			collection === undefined
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
