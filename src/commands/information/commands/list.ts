import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder, user } from 'logos/src/commands/mod.ts';
import { listWarnings } from 'logos/src/commands/information/commands/list/mod.ts';

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
