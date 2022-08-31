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
import { collection } from '../parameters.ts';

const command: OptionBuilder = {
	name: 'replay',
	nameLocalizations: {
		pl: 'powtórz',
		ro: 'reia',
	},
	description: 'Begins playing the currently playing song from the start.',
	descriptionLocalizations: {
		pl: 'Odtwarza obecnie grający utwór od początku.',
		ro: 'Redă melodia în curs de redare din nou.',
	},
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: replaySong,
	options: [collection],
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
