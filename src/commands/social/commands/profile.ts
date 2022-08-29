import { CommandBuilder } from '../../../commands/command.ts';
import roles from './profile/roles.ts';
import view from './profile/view.ts';

const command: CommandBuilder = {
	name: 'profile',
	nameLocalizations: {
		pl: 'profil',
		ro: 'profil',
	},
	description:
		'Allows the user to view information about themselves or another user.',
	descriptionLocalizations: {
		pl:
			'Pozwala użytkownikowi na wyświetlanie informacji o sobie lub o innych użytkownikach.',
		ro:
			'Permite utilizatorului afișarea informațiilor despre sine sau despre alți utilizatori.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [view, roles],
};

export default command;
