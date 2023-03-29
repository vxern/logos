import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { displayListings } from 'logos/src/commands/music/module.ts';
import { OptionTemplate } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client, localise } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionTemplate = {
	name: 'queue',
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPlaybackQueue,
	options: [show],
};

function handleDisplayPlaybackQueue([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const locale = show ? defaultLocale : interaction.locale;

	const queueString = localise(client, 'music.options.queue.strings.queue', locale)();

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
