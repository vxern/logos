import {
	ApplicationCommandOptionTypes,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import { displayListings } from '../module.ts';
import { show } from '../../parameters.ts';

const command: OptionBuilder = {
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
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: displaySongQueue,
	options: [show],
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
