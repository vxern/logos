import { Commands } from '../../../../../assets/localisations/commands.ts';
import { localise } from '../../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { defaultLanguage } from '../../../../types.ts';

function displayVolume(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const show =
		(<boolean | undefined> interaction.data?.options?.at(0)?.options?.at(0)
			?.value) ?? false;

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [{
					title: `🔊 ${
						localise(Commands.music.strings.volume.header, defaultLanguage)
					}`,
					description: localise(
						Commands.music.strings.volume.body,
						defaultLanguage,
					)(musicController.volume),
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export { displayVolume };
