import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { SongListingContentTypes } from '../data/song-listing.ts';

const command: OptionBuilder = {
	name: 'skip',
	nameLocalizations: {
		pl: 'przewiń',
		ro: 'sari-peste',
	},
	description: 'Skips the currently playing song.',
	descriptionLocalizations: {
		pl: 'Przewija obecnie grający utwór.',
		ro: 'Sare peste melodia în curs de redare.',
	},
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: skipSong,
	options: [{
		name: 'collection',
		nameLocalizations: {
			pl: 'zbiór',
			ro: 'set',
		},
		description: 'If set to true, skips the song collection instead.',
		descriptionLocalizations: {
			pl: 'Jeśli tak, w zamian przewija zbiór piosenek.',
			ro: 'Dacă da, în schimb se va sări setul de melodii peste.',
		},
		type: ApplicationCommandOptionTypes.Boolean,
	}, {
		name: 'by',
		nameLocalizations: {
			pl: 'o',
			ro: 'cu',
		},
		description: 'The number of songs or song listings to skip by.',
		descriptionLocalizations: {
			pl: 'Liczba utworów lub wpisów, które mają być przewinięte.',
			ro: 'Numărul de melodii sau de înregistrări care să fie sărite peste.',
		},
		type: ApplicationCommandOptionTypes.Integer,
	}, {
		name: 'to',
		nameLocalizations: {
			pl: 'do',
			ro: 'până-la',
		},
		description: 'The index of the track to skip to.',
		descriptionLocalizations: {
			pl: 'Indeks utworu lub wpisu do którego przewinąć.',
			ro:
				'Indexul melodiei sau al înregistrării până la care să fie sărit peste.',
		},
		type: ApplicationCommandOptionTypes.Integer,
	}],
};

function skipSong(client: Client, interaction: Interaction): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _voiceState] = musicController.verifyMemberVoiceState(
		interaction,
	);
	if (!canAct) return;

	const data = interaction.data;
	if (!data) return;

	const skipCollection =
		(<boolean | undefined> data.options?.find((option) =>
			option.name === 'collection'
		)?.value) ?? false;

	const byString = <string | undefined> data.options?.find((option) =>
		option.name === 'by'
	)?.value;
	const toString = <string | undefined> data.options?.find((option) =>
		option.name === 'to'
	)?.value;

	const by = byString ? Number(byString) : undefined;
	if (by && isNaN(by)) return;

	const to = toString ? Number(toString) : undefined;
	if (to && isNaN(to)) return;

	const songListing = musicController.current;

	if (!musicController.isOccupied || !songListing) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Nothing to skip',
						description: 'There is no song to skip.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	if (
		skipCollection &&
		songListing.content.type !== SongListingContentTypes.Collection
	) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Not playing a collection',
						description:
							`There is no song collection to skip. Try skipping the current song instead.`,
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	if (by && to) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Too many skip operations',
						description:
							`You may not skip by a number of songs __and__ skip to a certain song in the same query.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	if ((by && by <= 0) || (to && to <= 0)) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'No negative integers or 0',
						description:
							'The skip operation may not be defined by negative integers or 0.',
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	if (by) {
		if (
			songListing.content.type === SongListingContentTypes.Collection &&
			!skipCollection
		) {
			const listingsToSkip = Math.min(
				by,
				songListing.content.songs.length -
					(songListing.content.position + 1),
			);

			musicController.skip(skipCollection, {
				by: listingsToSkip,
				to: undefined,
			});
		} else {
			const listingsToSkip = Math.min(by, musicController.queue.length);

			musicController.skip(skipCollection, {
				by: listingsToSkip,
				to: undefined,
			});
		}
	} else if (to) {
		if (
			songListing.content.type === SongListingContentTypes.Collection &&
			!skipCollection
		) {
			const listingToSkipTo = Math.min(to, songListing.content.songs.length);

			musicController.skip(skipCollection, {
				by: undefined,
				to: listingToSkipTo,
			});
		} else {
			const listingToSkipTo = Math.min(to, musicController.queue.length);

			musicController.skip(skipCollection, {
				by: undefined,
				to: listingToSkipTo,
			});
		}
	}

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: '⏭️ Skipped',
					description: `The ${
						!skipCollection ? 'song' : 'song collection'
					} has been skipped.`,
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export default command;
