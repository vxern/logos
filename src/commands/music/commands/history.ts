import {
	_,
	ApplicationCommandOptionTypes,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import { displayListings } from '../module.ts';

const command: CommandBuilder = {
	name: 'history',
	nameLocalizations: {
		pl: 'historia',
		ro: 'istorie',
	},
	description: 'Displays a list of previously played songs.',
	descriptionLocalizations: {
		pl: 'Wyświetla listę zagranych piosenek.',
		ro: 'Afișează lista tututor melodiilor redate.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: displaySongHistory,
	options: [{
		name: 'show',
		nameLocalizations: {
			pl: 'wyświetl-innym',
			ro: 'arată-le-celorlalți',
		},
		description: 'If set to true, the list will be shown to others.',
		descriptionLocalizations: {
			pl: 'Jeśli tak, lista będzie wyświetlona innym użytkownikom.',
			ro: 'Dacă da, lista va fi afișată altor utilizatori.',
		},
		type: ApplicationCommandOptionTypes.Boolean,
	}],
};

function displaySongHistory(client: Client, interaction: Interaction): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const show =
		(<boolean | undefined> interaction.data?.options?.find((option) =>
			option.name === 'show'
		)?.value) ?? false;

	const listingHistory = _.cloneDeep(musicController.history);

	listingHistory.reverse();

	return displayListings(client, interaction, {
		title: '📋 Playback History',
		songListings: listingHistory,
		show: show,
	});
}

export default command;
