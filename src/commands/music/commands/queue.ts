import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { Commands, createLocalisations, localise } from '../../../../assets/localisations/mod.ts';
import { Client } from '../../../client.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import { displayListings } from '../module.ts';
import { show } from '../../parameters.ts';
import { parseArguments } from '../../../utils.ts';

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

	const [{ show }] = parseArguments(interaction.data?.options, {
		show: 'boolean',
	});

	return displayListings([client, bot], interaction, {
		title: `📋 ${localise(Commands.music.options.queue.strings.queue, interaction.locale)}`,
		songListings: musicController.queue,
		show: show ?? false,
	});
}

export default command;
