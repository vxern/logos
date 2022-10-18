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
import { SongListingContentTypes } from '../data/song-listing.ts';
import { collection } from '../parameters.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.replay),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: replaySong,
	options: [collection],
};

function replaySong(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _voiceState] = musicController.verifyMemberVoiceState(
		interaction,
	);
	if (!canAct) return;

	const replayCollection =
		(<boolean | undefined> interaction.data?.options?.at(0)?.options?.find((
			option,
		) => option.name === 'collection')?.value) ?? false;

	const currentListing = musicController.current;

	if (!musicController.isOccupied || !currentListing) {
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
							Commands.music.options.replay.strings.noSongToReplay,
							interaction.locale,
						),
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
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(
							Commands.music.options.replay.strings.noSongCollectionToReplay,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	return musicController.replay(interaction, replayCollection);
}

export default command;
