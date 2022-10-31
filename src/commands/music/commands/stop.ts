import { Commands } from '../../../../assets/localisations/commands.ts';
import { createLocalisations, localise } from '../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	InteractionResponseTypes,
} from '../../../../deps.ts';
import { Interaction, sendInteractionResponse } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { defaultLanguage } from '../../../types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.stop),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: stopSession,
};

function stopSession(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _] = musicController.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	if (!musicController.isOccupied) {
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
							Commands.music.options.stop.strings.notPlayingMusic,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	musicController.reset();

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `⏹️ ${
						localise(
							Commands.music.options.stop.strings.stopped.header,
							defaultLanguage,
						)
					}`,
					description: localise(
						Commands.music.options.stop.strings.stopped.body,
						defaultLanguage,
					),
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);
}

export default command;
