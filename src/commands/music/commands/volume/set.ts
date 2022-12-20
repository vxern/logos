import { Bot, Interaction, InteractionResponseTypes, sendInteractionResponse } from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { getVoiceState, setVolume, verifyVoiceState } from 'logos/src/controllers/music.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import configuration from 'logos/configuration.ts';

function handleSetVolume(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const voiceState = getVoiceState(client, interaction);

	const isVoiceStateVerified = verifyVoiceState(bot, interaction, controller, voiceState);
	if (!isVoiceStateVerified) return;

	const [{ volume }] = parseArguments(interaction.data?.options, { volume: 'number' });
	if (volume === undefined || isNaN(volume)) return;

	if (volume < 0 || volume > configuration.music.limits.volume) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					embeds: [{
						description: localise(Commands.music.options.volume.options.set.strings.invalidVolume, interaction.locale)(
							configuration.music.limits.volume,
						),
						color: configuration.messages.colors.red,
					}],
				},
			},
		);
	}

	setVolume(controller.player, volume);

	const volumeString = localise(Commands.music.options.volume.options.set.strings.volumeSet.header, interaction.locale);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `🔊 ${volumeString}`,
					description: localise(Commands.music.options.volume.options.set.strings.volumeSet.body, interaction.locale)(
						volume,
					),
					color: configuration.messages.colors.invisible,
				}],
			},
		},
	);
}

export { handleSetVolume };
