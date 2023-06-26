import { ApplicationCommandOptionTypes } from 'discordeno';
import { handleDisplayVolume } from 'logos/src/lib/commands/music/commands/volume/display.ts';
import { handleSetVolume } from 'logos/src/lib/commands/music/commands/volume/set.ts';
import { OptionTemplate } from 'logos/src/lib/commands/command.ts';
import { show } from 'logos/src/lib/commands/parameters.ts';

const command: OptionTemplate = {
	name: 'volume',
	type: ApplicationCommandOptionTypes.SubCommandGroup,
	options: [{
		name: 'display',
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleDisplayVolume,
		options: [show],
	}, {
		name: 'set',
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleSetVolume,
		options: [{
			name: 'volume',
			type: ApplicationCommandOptionTypes.Integer,
			required: true,
		}],
	}],
};

export default command;
