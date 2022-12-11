import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { displayListings } from 'logos/src/commands/music/module.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.queue),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPlaybackQueue,
	options: [show],
};

function handleDisplayPlaybackQueue(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (musicController === undefined) return;

	const [{ show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

  const queueString = localise(Commands.music.options.queue.strings.queue, interaction.locale);

	return displayListings([client, bot], interaction, {
		title: `📋 ${queueString}`,
		songListings: musicController.queue,
		show: show ?? false,
	});
}

export default command;
