import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { OptionBuilder } from 'logos/src/commands/mod.ts';
import { Client, configuration, defaultLanguage } from 'logos/src/mod.ts';
import { resumeSong } from 'logos/src/commands/music/commands/mod.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.pause),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: pauseSong,
};

function pauseSong(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _voiceState] = musicController.verifyMemberVoiceState(
		interaction,
	);
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
							Commands.music.options.pause.strings.noSongToPause,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	if (musicController.isPaused) {
		return resumeSong([client, bot], interaction);
	}

	musicController.pause();

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `⏸️ ${
						localise(
							Commands.music.options.pause.strings.paused.header,
							defaultLanguage,
						)
					}`,
					description: localise(
						Commands.music.options.pause.strings.paused.body,
						defaultLanguage,
					),
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export default command;
