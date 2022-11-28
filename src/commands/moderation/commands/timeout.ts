import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import { handleSetTimeout } from 'logos/src/commands/moderation/commands/timeout/set.ts';
import { handleClearTimeout } from 'logos/src/commands/moderation/commands/timeout/clear.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { duration, reason, user } from 'logos/src/commands/parameters.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.timeout),
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	options: [{
		...createLocalisations(Commands.timeout.options.set),
		type: ApplicationCommandOptionTypes.SubCommand,
		options: [user, duration, reason],
		handle: handleSetTimeout,
	}, {
		...createLocalisations(Commands.timeout.options.clear),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleClearTimeout,
		options: [user],
	}],
};

export default command;
