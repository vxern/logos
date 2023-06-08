import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from 'discordeno';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { handleSetLanguage } from 'logos/src/commands/developer/commands/set/language.ts';

const command: CommandTemplate = {
	name: 'set',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['ADMINISTRATOR'],
	options: [{
		name: 'language',
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleSetLanguage,
		options: [{
			name: 'language',
			type: ApplicationCommandOptionTypes.String,
			required: true,
		}],
	}],
};

export default command;
