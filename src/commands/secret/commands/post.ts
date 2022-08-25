import { ApplicationCommandOptionTypes } from '../../../../deps.ts';
import { CommandBuilder } from '../../command.ts';
import { postRules } from './post/rules.ts';
import { postWelcome } from './post/welcome.ts';

const command: CommandBuilder = {
	name: 'post',
	nameLocalizations: {
		pl: 'wstaw',
		ro: 'postează',
	},
	description:
		'Allows the user to post various core server messages, such as the server rules.',
	descriptionLocalizations: {
		pl:
			'Pozwala użytkownikowi na wstawianie różnych wiadomości serwerowych, takich jak regulamin.',
		ro:
			'Permite utilizatorului postarea diverselor mesaje de server, precum regulamentul.',
	},
	defaultMemberPermissions: ['ADMINISTRATOR'],
	options: [{
		name: 'rules',
		nameLocalizations: {
			pl: 'regulamin',
			ro: 'regulament',
		},
		description: 'Posts a message containing the server rules.',
		descriptionLocalizations: {
			pl: 'Wstawia wiadomość zawierającą regulamin.',
			ro: 'Postează un mesaj care conține regulamentul.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: postRules,
	}, {
		name: 'welcome',
		nameLocalizations: {
			pl: 'powitanie',
			ro: 'bun-venit',
		},
		description: 'Posts a message containing the welcome message.',
		descriptionLocalizations: {
			pl:
				'Wstawia wiadomość zawierającą powitanie dla nowych członków serwera.',
			ro:
				'Postează un mesaj care conține un bun-venit pentru membri noi ai serverului.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: postWelcome,
	}],
};

export default command;
