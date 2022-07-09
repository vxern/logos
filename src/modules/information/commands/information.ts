import { ApplicationCommandOptionType } from '../../../../deps.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import { displayBotInformation } from './information/bot.ts';
import { displayGuildInformation } from './information/guild.ts';

const command: Command = {
	name: 'information',
	description: 'Used to display various information.',
	availability: Availability.MEMBERS,
	options: [{
		name: 'bot',
		description: 'Displays information about the bot.',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		handle: displayBotInformation,
	}, {
		name: 'server',
		description: 'Displays information about the server.',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		handle: displayGuildInformation,
	}],
};

export default command;
