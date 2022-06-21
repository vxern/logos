import { ApplicationCommandOptionType } from '../../../../deps.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { postRules } from './post/rules.ts';
import { postWelcome } from './post/welcome.ts';

const command: Command = {
	name: 'post',
	availability: Availability.OWNER,
	options: [{
		name: 'rules',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		handle: postRules,
	}, {
		name: 'welcome',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		handle: postWelcome,
	}],
};

export default command;
