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
import { show } from '../../parameters.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.volume),
	type: ApplicationCommandOptionTypes.SubCommandGroup,
	options: [{
		...createLocalisations(Commands.music.options.volume.options.display),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: displayVolume,
		options: [show],
	}, {
		...createLocalisations(Commands.music.options.volume.options.set),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: setVolume,
		options: [{
			...createLocalisations(
				Commands.music.options.volume.options.set.options.volume(
					configuration.music.maxima.volume,
				),
			),
			type: ApplicationCommandOptionTypes.Integer,
			required: true,
		}],
	}],
};

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

function setVolume(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _] = musicController.verifyMemberVoiceState(interaction);
	if (!canAct) return;

	const volumeString = interaction.data?.options?.at(0)?.options?.at(0)?.value;
	if (!volumeString) return;

	const volume = Number(volumeString);
	if (isNaN(volume)) return;

	if (volume < 0 || volume > configuration.music.maxima.volume) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					embeds: [{
						description: localise(
							Commands.music.strings.invalidVolume,
							interaction.locale,
						)(configuration.music.maxima.volume),
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	musicController.setVolume(volume);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `🔊 ${
						localise(
							Commands.music.strings.volumeSet.header,
							interaction.locale,
						)
					}`,
					description: localise(
						Commands.music.strings.volumeSet.body,
						interaction.locale,
					)(volume),
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export default command;
