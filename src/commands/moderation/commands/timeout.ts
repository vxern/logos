import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands } from '../../../../assets/localisations/commands.ts';
import { createLocalisations } from '../../../../assets/localisations/types.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import { user } from '../../parameters.ts';
import { duration, reason } from '../parameters.ts';
import { clearTimeout } from './timeout/clear.ts';
import { setTimeout } from './timeout/set.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.timeout),
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	options: [{
		...createLocalisations(Commands.timeout.options.set),
		type: ApplicationCommandOptionTypes.SubCommand,
		options: [user, duration, reason],
		handle: setTimeout,
	}, {
		...createLocalisations(Commands.timeout.options.clear),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: clearTimeout,
		options: [user],
	}],
};

export default command;
