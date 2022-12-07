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
	handle: handleStopPlayback,
};

function handleStopPlayback(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (musicController === undefined) return;

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
						description: localise(Commands.music.options.stop.strings.notPlayingMusic, interaction.locale),
						color: configuration.messages.colors.yellow,
					}],
				},
			},
		);
	}

	musicController.reset();

	const stoppedString = localise(Commands.music.options.stop.strings.stopped.header, defaultLanguage);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `⏹️ ${stoppedString}`,
					description: localise(Commands.music.options.stop.strings.stopped.body, defaultLanguage),
					color: configuration.messages.colors.blue,
				}],
			},
		},
	);
}

export default command;
