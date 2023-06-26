import { ApplicationCommandOptionTypes } from 'discordeno';
import { handleRequestFilePlayback } from 'logos/src/lib/commands/music/commands/play/file.ts';
import { handleRequestQueryPlayback } from 'logos/src/lib/commands/music/commands/play/query.ts';
import { sources } from 'logos/src/lib/commands/music/data/sources/sources.ts';
import { OptionTemplate } from 'logos/src/lib/commands/command.ts';
import { query } from 'logos/src/lib/commands/parameters.ts';

const command: OptionTemplate = {
	name: 'play',
	type: ApplicationCommandOptionTypes.SubCommandGroup,
	options: [
		{
			name: 'file',
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleRequestFilePlayback,
			options: [{
				name: 'url',
				type: ApplicationCommandOptionTypes.String,
				required: true,
			}],
		},
		...Object.entries(sources).map<OptionTemplate>(([name, resolve]) => ({
			name: name.toLowerCase(),
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: ([client, bot], interaction) => handleRequestQueryPlayback([client, bot], interaction, resolve),
			options: [query],
		})),
	],
};

export default command;
