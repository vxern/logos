import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { lodash } from 'lodash';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { displayListings } from 'logos/src/commands/music/module.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.history),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPlaybackHistory,
	options: [show],
};

function handleDisplayPlaybackHistory([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const [{ show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const listingHistory = lodash.cloneDeep(controller.listingHistory).toReversed();

	const locale = show ? defaultLocale : interaction.locale;

	const titleString = localise(Commands.music.options.history.strings.playbackHistory, locale);

	return displayListings(
		[client, bot],
		interaction,
		{ title: `${constants.symbols.music.list} ${titleString}`, songListings: listingHistory },
		show ?? false,
		locale,
	);
}

export default command;
