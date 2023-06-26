import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { displayListings } from 'logos/src/lib/commands/music/module.ts';
import { OptionTemplate } from 'logos/src/lib/commands/command.ts';
import { show } from 'logos/src/lib/commands/parameters.ts';
import { Client, localise } from 'logos/src/lib/client.ts';
import { parseArguments } from 'logos/src/lib/interactions.ts';
import constants from 'logos/src/constants.ts';
import { defaultLocale } from 'logos/src/types.ts';

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

	const strings = {
		queue: localise(client, 'music.options.queue.strings.queue', locale)(),
	};

	return displayListings(
		[client, bot],
		interaction,
		{ title: `${constants.symbols.music.list} ${strings.queue}`, songListings: controller.listingQueue },
		show ?? false,
		locale,
	);
}

export default command;
