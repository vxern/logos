import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/mod.ts';
import { user } from 'logos/src/commands/mod.ts';
import { duration, reason } from 'logos/src/commands/moderation/mod.ts';
import { clearTimeout, setTimeout } from 'logos/src/commands/moderation/commands/timeout/mod.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.timeout),
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	options: [{
		...createLocalisations(Commands.timeout.options.set),
		type: ApplicationCommandOptionTypes.SubCommand,
		options: [user, duration, reason],
		handle: setTimeout,
	}, {
		...createLocalisations(Commands.timeout.options.clear),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: clearTimeout,
		options: [user],
	}],
};

export default command;
