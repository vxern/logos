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
import { defaultLocale } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.resume),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleResumePlayback,
};

function handleResumePlayback(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.features.music.controllers.get(interaction.guildId!);
	if (musicController === undefined) return;

	const [canAct, _] = musicController.verifyMemberVoiceState(bot, interaction);
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
						description: localise(Commands.music.options.resume.strings.noSongToResume, interaction.locale),
						color: configuration.messages.colors.yellow,
					}],
				},
			},
		);
	}

	if (!musicController.isPaused) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.options.resume.strings.notCurrentlyPaused, interaction.locale),
						color: configuration.messages.colors.yellow,
					}],
				},
			},
		);
	}

	musicController.resume();

	const resumedString = localise(Commands.music.options.resume.strings.resumed.header, defaultLocale);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `▶️ ${resumedString}`,
					description: localise(Commands.music.options.resume.strings.resumed.body, defaultLocale),
					color: configuration.messages.colors.invisible,
				}],
			},
		},
	);
}

export default command;
export { handleResumePlayback };
