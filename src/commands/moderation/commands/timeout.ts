import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from 'discordeno';
import { handleSetTimeout, handleSetTimeoutAutocomplete } from 'logos/src/commands/moderation/commands/timeout/set.ts';
import {
	handleClearTimeout,
	handleClearTimeoutAutocomplete,
} from 'logos/src/commands/moderation/commands/timeout/clear.ts';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { duration, reason, user } from 'logos/src/commands/parameters.ts';

const command: CommandTemplate = {
	name: 'timeout',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	options: [{
		name: 'set',
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleSetTimeout,
		handleAutocomplete: handleSetTimeoutAutocomplete,
		options: [user, duration, reason],
	}, {
		name: 'clear',
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleClearTimeout,
		handleAutocomplete: handleClearTimeoutAutocomplete,
		options: [user],
	}],
};

export default command;
