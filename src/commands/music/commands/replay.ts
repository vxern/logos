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
	name: 'replay',
	nameLocalizations: {
		pl: 'odtwórz-ponownie',
		ro: 'redă-din-nou',
	},
	description: 'Begins playing the currently playing song from the start.',
	descriptionLocalizations: {
		pl: 'Odtwarza obecnie grający utwór od początku.',
		ro: 'Redă melodia în curs de redare din nou.',
	},
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: replaySong,
	options: [{
		name: 'collection',
		nameLocalizations: {
			pl: 'zbiór',
			ro: 'set',
		},
		description:
			'If set to true, the currently playing song collection will be replayed.',
		descriptionLocalizations: {
			pl: 'Jeśli tak, obecnie grający zbiór utworów zostanie odtworzony.',
			ro:
				'Dacă da, se va reda setul de melodii care este actual în curs de redare.',
		},
		type: ApplicationCommandOptionTypes.Boolean,
	}],
};

function replaySong(
	client: Client,
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _voiceState] = musicController.verifyMemberVoiceState(
		interaction,
	);
	if (!canAct) return;

	const replayCollection =
		(<boolean | undefined> interaction.data?.options?.find((option) =>
			option.name === 'collection'
		)?.value) ?? false;

	const currentListing = musicController.current;

	if (!musicController.isOccupied || !currentListing) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Nothing to replay',
						description: 'There is no song to replay.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	if (
		replayCollection &&
		currentListing.content.type !== SongListingContentTypes.Collection
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
							'There is no song collection to replay. Try replaying the current song instead.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	return musicController.replay(interaction, replayCollection);
}

export default command;
