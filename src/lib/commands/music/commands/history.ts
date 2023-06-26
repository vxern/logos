import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { displayListings } from 'logos/src/lib/commands/music/module.ts';
import { OptionTemplate } from 'logos/src/lib/commands/command.ts';
import { show } from 'logos/src/lib/commands/parameters.ts';
import { Client, localise } from 'logos/src/lib/client.ts';
import { parseArguments } from 'logos/src/lib/interactions.ts';
import constants from 'logos/src/constants.ts';
import { defaultLocale } from 'logos/src/types.ts';

const command: OptionTemplate = {
	name: 'history',
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPlaybackHistory,
	options: [show],
};

function handleDisplayPlaybackHistory([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const listingHistory = structuredClone(controller.listingHistory).toReversed();

	const locale = show ? defaultLocale : interaction.locale;

	const strings = {
		title: localise(client, 'music.options.history.strings.playbackHistory', locale)(),
	};

	return displayListings(
		[client, bot],
		interaction,
		{ title: `${constants.symbols.music.list} ${strings.title}`, songListings: listingHistory },
		show ?? false,
		locale,
	);
}

export default command;
