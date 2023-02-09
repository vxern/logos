import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { displayListings } from 'logos/src/commands/music/module.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.queue),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPlaybackQueue,
	options: [show],
};

function handleDisplayPlaybackQueue([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const [{ show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const locale = show ? defaultLocale : interaction.locale;

	const queueString = localise(Commands.music.options.queue.strings.queue, locale);

	return displayListings(
		[client, bot],
		interaction,
		{
			title: `${constants.symbols.music.list} ${queueString}`,
			songListings: controller.listingQueue,
		},
		show ?? false,
		locale,
	);
}

export default command;
