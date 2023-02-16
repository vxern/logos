import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { handleResumePlayback } from 'logos/src/commands/music/commands/resume.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import {
	getVoiceState,
	isOccupied,
	isPaused,
	pause,
	verifyCanManipulatePlayback,
} from 'logos/src/controllers/music.ts';
import { Client } from 'logos/src/client.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.pause),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handlePausePlayback,
};

function handlePausePlayback([client, bot]: [Client, Bot], interaction: Interaction): void {
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
						description: localise(Commands.music.options.pause.strings.noSongToPause, interaction.locale),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	if (isPaused(controller.player)) {
		return handleResumePlayback([client, bot], interaction);
	}

	pause(controller.player);

	const pausedString = localise(Commands.music.options.pause.strings.paused.header, defaultLocale);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `${constants.symbols.music.paused} ${pausedString}`,
					description: localise(Commands.music.options.pause.strings.paused.body, defaultLocale),
					color: constants.colors.invisible,
				}],
			},
		},
	);
}

export default command;
