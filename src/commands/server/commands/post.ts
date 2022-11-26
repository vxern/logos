import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import { postInformation } from 'logos/src/commands/server/commands/post/information.ts';
import { postWelcome } from 'logos/src/commands/server/commands/post/welcome.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';

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
