import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import { handleDisplayVolume } from 'logos/src/commands/music/commands/volume/display.ts';
import { handleSetVolume } from 'logos/src/commands/music/commands/volume/set.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import configuration from 'logos/configuration.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.volume),
	type: ApplicationCommandOptionTypes.SubCommandGroup,
	options: [{
		...createLocalisations(Commands.music.options.volume.options.display),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleDisplayVolume,
		options: [show],
	}, {
		...createLocalisations(Commands.music.options.volume.options.set),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleSetVolume,
		options: [{
			...createLocalisations(
				Commands.music.options.volume.options.set.options.volume(configuration.music.limits.volume),
			),
			type: ApplicationCommandOptionTypes.Integer,
			required: true,
		}],
	}],
};

export default command;
