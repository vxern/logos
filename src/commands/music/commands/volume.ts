import { Commands } from '../../../../assets/localisations/commands.ts';
import {
	createLocalisations,
} from '../../../../assets/localisations/types.ts';
import {
	ApplicationCommandOptionTypes,
} from '../../../../deps.ts';
import { OptionBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { show } from '../../parameters.ts';
import { displayVolume } from './volume/display.ts';
import { setVolume } from "./volume/set.ts";

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
