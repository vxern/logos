import { ApplicationCommandOptionTypes } from 'discordeno';
import { handleDisplayVolume } from 'logos/src/commands/music/commands/volume/display.ts';
import { handleSetVolume } from 'logos/src/commands/music/commands/volume/set.ts';
import { OptionTemplate } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';

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
