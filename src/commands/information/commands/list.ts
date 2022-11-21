import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from '../../../../assets/localisations/mod.ts';
import { CommandBuilder, user } from '../../mod.ts';
import { listWarnings } from './list/mod.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.list),
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	options: [{
		...createLocalisations(Commands.list.options.warnings),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: listWarnings,
		options: [user],
	}],
};

export default command;
