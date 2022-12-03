import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { lodash } from 'lodash';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { displayListings } from 'logos/src/commands/music/module.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/utils.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.history),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPlaybackHistory,
	options: [show],
};

function handleDisplayPlaybackHistory(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const musicController = client.music.get(interaction.guildId!);
	if (musicController === undefined) return;

	const [{ show }] = parseArguments(interaction.data?.options, {
		show: 'boolean',
	});

	const listingHistory = lodash.cloneDeep(musicController.history).toReversed();

  const titleString = localise(Commands.music.options.history.strings.playbackHistory, interaction.locale);

	return displayListings([client, bot], interaction, {
		title: `📋 ${titleString}`,
		songListings: listingHistory,
		show: show ?? false,
	});
}

export default command;
