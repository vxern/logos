import {
	_,
	ApplicationCommandOptionTypes,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../command.ts';
import { displayListings } from '../module.ts';
import { show } from '../../parameters.ts';

const command: OptionBuilder = {
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
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: displaySongHistory,
	options: [show],
};

function displaySongHistory(client: Client, interaction: Interaction): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const show =
		(<boolean | undefined> interaction.data?.options?.at(0)?.options?.find((
			option,
		) => option.name === 'show')?.value) ?? false;

	const listingHistory = _.cloneDeep(musicController.history);

	listingHistory.reverse();

	return displayListings(client, interaction, {
		title: '📋 Playback History',
		songListings: listingHistory,
		show: show,
	});
}

export default command;
