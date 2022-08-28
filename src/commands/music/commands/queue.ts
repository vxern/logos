import {
	ApplicationCommandOptionTypes,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import { displayListings } from '../module.ts';

const command: CommandBuilder = {
	name: 'queue',
	nameLocalizations: {
		pl: 'kolejka',
		ro: 'coadă',
	},
	description: 'Displays a list of queued song listings.',
	descriptionLocalizations: {
		pl: 'Wyświetla listę utworów oraz zbiorów utworów w kolejce.',
		ro: 'Afișează lista cu melodii și seturi de melodii în coadă.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: displaySongQueue,
	options: [{
		name: 'show',
		nameLocalizations: {
			pl: 'wyświetl-innym',
			ro: 'arată-le-celorlalți',
		},
		description: 'If set to true, the queue view will be shown to others.',
		descriptionLocalizations: {
			pl: 'Jeśli tak, kolejka będzie wyświetlona innym użytkownikom.',
			ro: 'Dacă da, se va afișa coada altor utilizatori.',
		},
		type: ApplicationCommandOptionTypes.Boolean,
	}],
};

function displaySongQueue(
	client: Client,
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const show =
		(<boolean | undefined> interaction.data?.options?.find((option) =>
			option.name === 'show'
		)?.value) ?? false;

	return displayListings(client, interaction, {
		title: '📋 Queue',
		songListings: musicController.queue,
		show: show,
	});
}

export default command;
