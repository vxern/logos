import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import { handleRequestFilePlayback } from 'logos/src/commands/music/commands/play/file.ts';
import { handleRequestQueryPlayback } from 'logos/src/commands/music/commands/play/query.ts';
import { sources } from 'logos/src/commands/music/data/sources/sources.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { query } from 'logos/src/commands/parameters.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.play),
	type: ApplicationCommandOptionTypes.SubCommandGroup,
	options: [
		{
			...createLocalisations(Commands.music.options.play.options.file),
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleRequestFilePlayback,
			options: [{
				...createLocalisations(
					Commands.music.options.play.options.file.options.url,
				),
				type: ApplicationCommandOptionTypes.String,
				required: true,
			}],
		},
		...Object.entries(sources).map<OptionBuilder>(([name, resolve]) => ({
			...createLocalisations(Commands.music.options.play.options.source(name)),
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: ([client, bot], interaction) => handleRequestQueryPlayback([client, bot], interaction, resolve),
			options: [query],
		})),
	],
};

export default command;
