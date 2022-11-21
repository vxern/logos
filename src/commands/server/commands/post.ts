import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from '../../../../assets/localisations/mod.ts';
import { CommandBuilder } from '../../mod.ts';
import { postInformation, postWelcome } from './post/mod.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.post),
	defaultMemberPermissions: ['ADMINISTRATOR'],
	options: [{
		...createLocalisations(Commands.post.options.information),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: postInformation,
	}, {
		...createLocalisations(Commands.post.options.welcome),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: postWelcome,
	}],
};

export default command;
