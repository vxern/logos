import { ApplicationCommandOptionTypes } from '../../../../deps.ts';
import { CommandBuilder } from '../../command.ts';
import { displayBotInformation } from './information/bot.ts';
import { displayGuildInformation } from './information/guild.ts';

const command: CommandBuilder = {
	name: 'information',
	nameLocalizations: {
		pl: 'informacje',
		ro: 'informații',
	},
	description: 'Used to display various information.',
	descriptionLocalizations: {
		pl: 'Komenda używania do wyświetlania różnych informacji.',
		ro: 'Comandă utilizată pentru afișarea diverselor informații.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [{
		name: 'bot',
		nameLocalizations: {
			pl: 'bot',
			ro: 'bot',
		},
		description: 'Displays information about the bot.',
		descriptionLocalizations: {
			pl: 'Wyświetla informacje o bocie.',
			ro: 'Afișează informații despre bot.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: displayBotInformation,
	}, {
		name: 'server',
		nameLocalizations: {
			pl: 'serwer',
			ro: 'server',
		},
		description: 'Displays information about the server.',
		descriptionLocalizations: {
			pl: 'Wyświetla informacje o serwerze.',
			ro: 'Afișează informații despre server.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: displayGuildInformation,
	}],
};

export default command;
