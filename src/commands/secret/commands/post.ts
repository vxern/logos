import { Commands } from '../../../../assets/localisations/commands.ts';
import { createLocalisations } from '../../../../assets/localisations/types.ts';
import { ApplicationCommandOptionTypes } from '../../../../deps.ts';
import { CommandBuilder } from '../../command.ts';
import { postRules } from './post/rules.ts';
import { postWelcome } from './post/welcome.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.post),
	defaultMemberPermissions: ['ADMINISTRATOR'],
	options: [{
		...createLocalisations(Commands.post.options.rules),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: postRules,
	}, {
		...createLocalisations(Commands.post.options.welcome),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: postWelcome,
	}],
};

export default command;
