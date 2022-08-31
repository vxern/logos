import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { resumeSong } from './resume.ts';

const command: OptionBuilder = {
	name: 'pause',
	nameLocalizations: {
		pl: 'zapauzuj',
		ro: 'pauzează',
	},
	description: 'Pauses the currently playing song or song collection.',
	descriptionLocalizations: {
		pl: 'Zapauzuj obecny utwór lub zbiór utworów.',
		ro: 'Pauzează melodia sau setul de melodii în curs de redare.',
	},
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: pauseSong,
};

function pauseSong(client: Client, interaction: Interaction): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _voiceState] = musicController.verifyMemberVoiceState(
		interaction,
	);
	if (!canAct) return;

	if (!musicController.isOccupied) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Nothing to pause',
						description: 'There is no song to pause.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	if (musicController.isPaused) {
		return resumeSong(client, interaction);
	}

	musicController.pause();

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: '⏸️ Paused',
					description: 'The current song has been paused.',
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export default command;
