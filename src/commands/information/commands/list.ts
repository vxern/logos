import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import { handleDisplayWarnings } from 'logos/src/commands/information/commands/list/warnings.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { user } from 'logos/src/commands/parameters.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.list),
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	options: [{
		...createLocalisations(Commands.list.options.warnings),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleDisplayWarnings,
		options: [user],
	}],
};

export default command;
