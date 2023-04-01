import { Bot, Interaction, InteractionResponseTypes, sendInteractionResponse } from 'discordeno';
import { getVoiceState, setVolume, verifyCanManipulatePlayback } from 'logos/src/controllers/music.ts';
import { Client, localise } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';

function handleSetVolume([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyCanManipulatePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) return;

	const [{ volume }] = parseArguments(interaction.data?.options, { volume: 'number' });
	if (volume === undefined || isNaN(volume)) return;

	if (volume < 0 || volume > configuration.music.limits.volume) {
		const strings = {
			invalidVolume: localise(
				client,
				'music.options.volume.options.set.strings.invalidVolume',
				interaction.locale,
			)(
				{ 'volume': configuration.music.limits.volume },
			),
		};

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					embeds: [{
						description: strings.invalidVolume,
						color: constants.colors.red,
					}],
				},
			},
		);
	}

	setVolume(controller.player, volume);

	const strings = {
		title: localise(
			client,
			'music.options.volume.options.set.strings.volumeSet.title',
			interaction.locale,
		)(),
		description: localise(
			client,
			'music.options.volume.options.set.strings.volumeSet.description',
			interaction.locale,
		)(
			{ 'volume': volume },
		),
	};

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `${constants.symbols.music.volume} ${strings.title}`,
					description: strings.description,
					color: constants.colors.invisible,
				}],
			},
		},
	);
}

export { handleSetVolume };
