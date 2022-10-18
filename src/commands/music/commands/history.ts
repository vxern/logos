import {
	_,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../command.ts';
import { displayListings } from '../module.ts';
import { show } from '../../parameters.ts';
import {
	createLocalisations,
	localise,
} from '../../../../assets/localisations/types.ts';
import { Commands } from '../../../../assets/localisations/commands.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.history),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: displaySongHistory,
	options: [show],
};

function displaySongHistory(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const show =
		(<boolean | undefined> interaction.data?.options?.at(0)?.options?.find((
			option,
		) => option.name === 'show')?.value) ?? false;

	const listingHistory = _.cloneDeep(musicController.history);

	listingHistory.reverse();

	return displayListings([client, bot], interaction, {
		title: `📋 ${
			localise(
				Commands.music.options.history.strings.playbackHistory,
				interaction.locale,
			)
		}`,
		songListings: listingHistory,
		show: show,
	});
}

export default command;
