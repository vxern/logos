import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from 'discordeno';
import { handleDisplayBotInformation } from 'logos/src/lib/commands/information/commands/information/bot.ts';
import { handleDisplayGuildInformation } from 'logos/src/lib/commands/information/commands/information/guild.ts';
import { CommandTemplate } from 'logos/src/lib/commands/command.ts';

const command: CommandTemplate = {
	name: 'information',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [{
		name: 'bot',
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleDisplayBotInformation,
	}, {
		name: 'server',
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleDisplayGuildInformation,
	}],
};

export default command;
