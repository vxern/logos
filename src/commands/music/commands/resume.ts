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
import {
	getVoiceState,
	isOccupied,
	isPaused,
	resume,
	verifyCanManipulatePlayback,
} from 'logos/src/controllers/music.ts';
import { Client } from 'logos/src/client.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.resume),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleResumePlayback,
};

function handleResumePlayback([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyCanManipulatePlayback(
		bot,
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
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
						description: localise(Commands.music.options.resume.strings.noSongToResume, interaction.locale),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	if (!isPaused(controller.player)) {
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
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	resume(controller.player);

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
					color: constants.colors.invisible,
				}],
			},
		},
	);
}

export default command;
export { handleResumePlayback };
