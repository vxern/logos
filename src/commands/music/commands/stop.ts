import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	InteractionResponseTypes,
} from '../../../../deps.ts';
import { Interaction, sendInteractionResponse } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';

const command: OptionBuilder = {
	name: 'stop',
	nameLocalizations: {
		pl: 'przerwij',
		ro: 'oprire',
	},
	description:
		'Stops the current listening session, clearing the queue and song history.',
	descriptionLocalizations: {
		pl: 'Przerywa obecną sesję słuchania muzyki.',
		ro: 'Oprește sesiunea actuală de ascultare.',
	},
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: stopSession,
};

function stopSession(
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
						title: 'Nothing to stop',
						description: 'There is no active listening session.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	musicController.reset();

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: 'Session ended',
					description:
						'The listening session has been ended, and the song queue and history have been cleared.',
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);
}

export default command;
