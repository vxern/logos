import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from 'discordeno';
import {
	handleDisplayWarnings,
	handleDisplayWarningsAutocomplete,
} from 'logos/src/commands/information/commands/list/warnings.ts';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { user } from 'logos/src/commands/parameters.ts';

const command: CommandTemplate = {
	name: 'list',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [{
		name: 'warnings',
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleDisplayWarnings,
		handleAutocomplete: handleDisplayWarningsAutocomplete,
		options: [{ ...user, required: false }],
	}],
};

export default command;
