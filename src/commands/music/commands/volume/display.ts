import {
	ApplicationCommandFlags,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import configuration from 'logos/configuration.ts';
import { defaultLocale } from 'logos/types.ts';

function handleDisplayVolume(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.features.music.controllers.get(interaction.guildId!);
	if (musicController === undefined) return;

	const [{ show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const volumeString = localise(Commands.music.options.volume.options.display.strings.volume.header, defaultLocale);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [{
					title: `🔊 ${volumeString}`,
					description: localise(Commands.music.options.volume.options.display.strings.volume.body, defaultLocale)(
						musicController.volume,
					),
					color: configuration.messages.colors.invisible,
				}],
			},
		},
	);
}

export { handleDisplayVolume };
