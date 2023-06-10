import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from 'discordeno';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { handleSetLanguage } from 'logos/src/commands/developer/commands/metadata/language/set.ts';
import { handleResetLanguage } from 'logos/src/commands/developer/commands/metadata/language/reset.ts';

const command: CommandTemplate = {
	name: 'metadata',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['ADMINISTRATOR'],
	options: [{
		name: 'language',
		type: ApplicationCommandOptionTypes.SubCommandGroup,
		options: [{
			name: 'set',
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleSetLanguage,
			options: [{
				name: 'language',
				type: ApplicationCommandOptionTypes.String,
				required: true,
			}],
		}, {
			name: 'reset',
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleResetLanguage,
		}],
	}],
};

export default command;
