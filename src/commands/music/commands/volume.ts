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

const command: OptionBuilder = {
	name: 'volume',
	nameLocalizations: {
		pl: 'głośność',
		ro: 'volum',
	},
	description: 'Allows the user to manage the volume of music playback.',
	descriptionLocalizations: {
		pl: 'Pozwala użytkownikowi na zarządzanie głośnością odtwarzania muzyki.',
		ro: 'Permite utilizatorului gestionarea volumului redării muzicii.',
	},
	type: ApplicationCommandOptionTypes.SubCommandGroup,
	options: [{
		name: 'display',
		nameLocalizations: {
			pl: 'wyświetl',
			ro: 'afișează',
		},
		description: 'Displays the volume of playback.',
		descriptionLocalizations: {
			pl: 'Wyświetla głośność odtwarzania.',
			ro: 'Afișează volumul redării.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: displayVolume,
		options: [{
			name: 'show',
			nameLocalizations: {
				pl: 'wyświetl-innym',
				ro: 'arată-le-celorlalți',
			},
			description: 'If set to true, the volume will be shown to others.',
			descriptionLocalizations: {
				pl: 'Jeśli tak, głośność będzie wyświetlona innym użytkownikom.',
				ro: 'Dacă da, volumul va fi afișat altor utilizatori.',
			},
			type: ApplicationCommandOptionTypes.Boolean,
		}],
	}, {
		name: 'set',
		nameLocalizations: {
			pl: 'ustaw',
			ro: 'setează',
		},
		description: 'Sets the volume of playback.',
		descriptionLocalizations: {
			pl: 'Ustawia głośność odtwarzania.',
			ro: 'Setează volumul redării.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: setVolume,
		options: [{
			name: 'volume',
			nameLocalizations: {
				pl: 'głośność',
				ro: 'volum',
			},
			description:
				`A value between 0 and ${configuration.music.maxima.volume}.`,
			descriptionLocalizations: {
				pl: `Wartość 0–${configuration.music.maxima.volume}.`,
				ro: `O valoare 0–${configuration.music.maxima.volume}.`,
			},
			type: ApplicationCommandOptionTypes.Integer,
			required: true,
		}],
	}],
};

function displayVolume(
	client: Client,
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const show =
		(<boolean | undefined> interaction.data?.options?.at(0)?.options?.at(0)
			?.value) ?? false;

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [{
					title: '🔊 Volume',
					description: `The current volume is ${musicController.volume}%.`,
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

function setVolume(
	client: Client,
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
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					embeds: [{
						title: 'Invalid volume',
						description:
							`Song volume may not be negative, and it may not be bigger than ${configuration.music.maxima.volume}%.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	musicController.setVolume(volume);

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: '🔊 Volume set',
					description: `The volume has been set to ${volume}%.`,
					color: configuration.interactions.responses.colors.invisible,
				}],
			},
		},
	);
}

export default command;
