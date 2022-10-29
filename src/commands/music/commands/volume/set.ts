import { Commands } from '../../../../../assets/localisations/commands.ts';
import { localise } from '../../../../../assets/localisations/types.ts';
import {
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { parseArguments } from '../../../../utils.ts';

function setVolume(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _] = musicController.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	const [{ volume }] = parseArguments(interaction.data!.options, {
		volume: 'number',
	});

	if (!volume || isNaN(volume)) return;

	if (volume < 0 || volume > configuration.music.maxima.volume) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					embeds: [{
						description: localise(
							Commands.music.options.volume.options.set.strings.invalidVolume,
							interaction.locale,
						)(configuration.music.maxima.volume),
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	musicController.setVolume(volume);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `🔊 ${
						localise(
							Commands.music.options.volume.options.set.strings.volumeSet
								.header,
							interaction.locale,
						)
					}`,
					description: localise(
						Commands.music.options.volume.options.set.strings.volumeSet.body,
						interaction.locale,
					)(volume),
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export { setVolume };
