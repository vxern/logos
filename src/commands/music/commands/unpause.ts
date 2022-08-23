import {
	ApplicationCommandFlags,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';

const command: CommandBuilder = {
	name: 'unpause',
	nameLocalizations: {
		pl: 'wznów',
		ro: 'continuă',
	},
	description: 'Unpauses the currently playing song if it is paused.',
	descriptionLocalizations: {
		pl:
			'Wznawia odtwarzanie obecnie grającego utworu, jeśli ten jest zapauzowany.',
		ro:
			'Anulează întreruperea redării melodiei actuale dacă aceasta este în pauză.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: unpause,
};

function unpause(
	client: Client,
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const [canAct, _] = musicController.verifyMemberVoiceState(interaction);
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
						title: 'Nothing to unpause',
						description: 'There is no song to unpause.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	if (!musicController.isPaused) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Not paused',
						description: 'The current song is not paused.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	musicController.unpause();

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: '▶️ Unpaused',
					description: 'The current song has been unpaused.',
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export default command;
export { unpause };
