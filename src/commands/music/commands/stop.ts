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
import { getVoiceState, isOccupied, reset, verifyVoiceState } from 'logos/src/controllers/music.ts';
import { Client } from 'logos/src/client.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.stop),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleStopPlayback,
};

function handleStopPlayback([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const voiceState = getVoiceState(client, interaction);

	const isVoiceStateVerified = verifyVoiceState(bot, interaction, controller, voiceState);
	if (!isVoiceStateVerified) return;

	if (!isOccupied(controller.player)) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.strings.notPlayingMusic, interaction.locale),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	reset(client, interaction.guildId!);

	const stoppedString = localise(Commands.music.options.stop.strings.stopped.header, defaultLocale);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `⏹️ ${stoppedString}`,
					description: localise(Commands.music.options.stop.strings.stopped.body, defaultLocale),
					color: constants.colors.blue,
				}],
			},
		},
	);
}

export default command;
