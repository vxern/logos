import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { Client } from 'logos/src/client.ts';
import configuration from 'logos/configuration.ts';
import { defaultLanguage } from 'logos/types.ts';

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
