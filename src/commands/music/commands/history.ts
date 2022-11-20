import { _, ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../command.ts';
import { displayListings } from '../module.ts';
import { show } from '../../parameters.ts';
import { createLocalisations, localise } from '../../../../assets/localisations/types.ts';
import { Commands } from '../../../../assets/localisations/commands.ts';
import { parseArguments } from '../../../utils.ts';

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

	const [{ show }] = parseArguments(interaction.data?.options, {
		show: 'boolean',
	});

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
		show: show ?? false,
	});
}

export default command;
