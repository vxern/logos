import {
	ApplicationCommandFlags,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { defaultLanguage } from 'logos/types.ts';

function displayVolume(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [{ show }] = parseArguments(interaction.data?.options, {
		show: 'boolean',
	});

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
						localise(
							Commands.music.options.volume.options.display.strings.volume
								.header,
							defaultLanguage,
						)
					}`,
					description: localise(
						Commands.music.options.volume.options.display.strings.volume.body,
						defaultLanguage,
					)(musicController.volume),
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export { displayVolume };
