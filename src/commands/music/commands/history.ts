import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { lodash } from 'lodash';
import { Commands, createLocalisations, localise } from '../../../../assets/localisations/mod.ts';
import { Client, parseArguments } from '../../../mod.ts';
import { OptionBuilder, show } from '../../mod.ts';
import { displayListings } from '../mod.ts';

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

	const listingHistory = lodash.cloneDeep(musicController.history);

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
