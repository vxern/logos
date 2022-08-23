import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { SongListingContentTypes } from '../data/song-listing.ts';

const command: CommandBuilder = {
	name: 'unskip',
	nameLocalizations: {
		pl: 'przywróć',
		ro: 'înapoiază',
	},
	description: 'Brings back the last played song.',
	descriptionLocalizations: {
		pl: 'Przywraca ostatnio zagrany utwór lub zbiór utworów.',
		ro: 'Înapoiază ultima melodie sau ultimul set de melodii redat.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: unskip,
	options: [{
		name: 'collection',
		nameLocalizations: {
			pl: 'zbiór',
			ro: 'set',
		},
		description:
			'If set to true, the last played song outside of the current song collection will be played.',
		descriptionLocalizations: {
			pl:
				'Jeśli tak, ostatni zagrany utwór z poza obecnego zbioru utworów będzie odtworzony.',
			ro:
				'Dacă da, ultima melodie redată din afară de setul de melodii în curs de redare va fi redată.',
		},
		type: ApplicationCommandOptionTypes.Boolean,
	}, {
		name: 'by',
		nameLocalizations: {
			pl: 'o',
			ro: 'cu',
		},
		description: 'The number of songs or song listings to unskip by.',
		descriptionLocalizations: {
			pl: 'Liczba utworów lub wpisów, które mają być przywrócone.',
			ro: 'Numărul de melodii sau de înregistrări care să fie înapoiate.',
		},
		type: ApplicationCommandOptionTypes.Integer,
	}, {
		name: 'to',
		nameLocalizations: {
			pl: 'do',
			ro: 'până-la',
		},
		description: 'The index of the track to unskip to.',
		descriptionLocalizations: {
			pl: 'Indeks utworu lub wpisu który przywrócić.',
			ro: 'Indexul melodiei sau al înregistrării care să fie înapoiat.',
		},
		type: ApplicationCommandOptionTypes.Integer,
	}],
};

function unskip(
	client: Client,
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _] = musicController.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	const data = interaction.data;
	if (!data) return;

	const unskipCollection =
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

	const isUnskippingListing = !songListing ||
		songListing.content.type !== SongListingContentTypes.Collection ||
		(songListing.content.type === SongListingContentTypes.Collection &&
			(unskipCollection || songListing.content.position === 0));

	if (isUnskippingListing && musicController.history.length === 0) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Nothing to unskip',
						description: 'There is nothing to unskip.',
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
							`There is no song collection to unskip. Try unskipping the current song instead.`,
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	if (musicController.isOccupied && !musicController.canPushToQueue) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'The queue is full',
						description:
							'The last played song listing cannot be unskipped because the song queue is already full.',
						color: configuration.interactions.responses.colors.red,
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
							`You may not unskip by a number of songs __and__ unskip to a certain song in the same query.`,
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
				songListing?.content.type === SongListingContentTypes.Collection &&
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
				songListing?.content.type === SongListingContentTypes.Collection &&
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
					title: '⏮️ Unskipped',
					description: 'The last played song listing has been brought back.',
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export default command;
