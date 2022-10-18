import {
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import { displayListings } from '../module.ts';
import { show } from '../../parameters.ts';
import {
	createLocalisations,
	localise,
} from '../../../../assets/localisations/types.ts';
import { Commands } from '../../../../assets/localisations/commands.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.queue),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: displaySongQueue,
	options: [show],
};

function displaySongQueue(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (!musicController) return;

	const show =
		(<boolean | undefined> interaction.data?.options?.at(0)?.options?.find((
			option,
		) => option.name === 'show')?.value) ?? false;

	return displayListings([client, bot], interaction, {
		title: `📋 ${
			localise(Commands.music.options.queue.strings.queue, interaction.locale)
		}`,
		songListings: musicController.queue,
		show: show,
	});
}

export default command;
