import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import { OptionBuilder } from 'logos/src/commands/mod.ts';
import { configuration } from 'logos/src/mod.ts';
import { show } from 'logos/src/commands/mod.ts';
import { displayVolume, setVolume } from 'logos/src/commands/music/commands/volume/mod.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.volume),
	type: ApplicationCommandOptionTypes.SubCommandGroup,
	options: [{
		...createLocalisations(Commands.music.options.volume.options.display),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: displayVolume,
		options: [show],
	}, {
		...createLocalisations(Commands.music.options.volume.options.set),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: setVolume,
		options: [{
			...createLocalisations(
				Commands.music.options.volume.options.set.options.volume(
					configuration.music.maxima.volume,
				),
			),
			type: ApplicationCommandOptionTypes.Integer,
			required: true,
		}],
	}],
};

export default command;
