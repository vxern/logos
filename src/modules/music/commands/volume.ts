import { ApplicationCommandOptionType } from '../../../../deps.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';

const command: Command = {
	name: 'volume',
	availability: Availability.MEMBERS,
	options: [{
		name: 'display',
		description: 'Displays the volume of playback.',
		type: ApplicationCommandOptionType.SUB_COMMAND,
	}, {
		name: 'set',
		description: 'Sets the volume of playback.',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		options: [{
			name: 'volume',
			description: `A value between 0 and ${configuration.music.maxima.volume}`,
			required: true,
			type: ApplicationCommandOptionType.INTEGER,
		}],
	}],
};

export default command;
