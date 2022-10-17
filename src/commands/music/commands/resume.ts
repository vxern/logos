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
import { defaultLanguage } from '../../../types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.resume),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: resumeSong,
};

function resumeSong(
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
							Commands.music.strings.noSongToResume,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
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
						description: localise(
							Commands.music.strings.notCurrentlyPaused,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	musicController.resume();

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `▶️ ${
						localise(Commands.music.strings.resumed.header, defaultLanguage)
					}`,
					description: localise(
						Commands.music.strings.resumed.body,
						defaultLanguage,
					),
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export default command;
export { resumeSong };
