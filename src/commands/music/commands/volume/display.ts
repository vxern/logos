import {
	ApplicationCommandFlags,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { getVoiceState, verifyVoiceState } from 'logos/src/controllers/music.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

function handleDisplayVolume([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyVoiceState(
		bot,
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
		'check',
	);
	if (!isVoiceStateVerified) return;

	const locale = show ? defaultLocale : interaction.locale;

	const volumeString = localise(Commands.music.options.volume.options.display.strings.volume.header, locale);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [{
					title: `${constants.symbols.music.volume} ${volumeString}`,
					description: localise(Commands.music.options.volume.options.display.strings.volume.body, locale)(
						controller.player.volume,
					),
					color: constants.colors.invisible,
				}],
			},
		},
	);
}

export { handleDisplayVolume };
