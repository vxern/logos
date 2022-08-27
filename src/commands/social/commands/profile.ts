import { ApplicationCommandOptionTypes } from '../../../../deps.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import { user } from '../../parameters.ts';
import { selectRoles } from './profile/roles.ts';
import { viewProfile } from './profile/view.ts';

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
	options: [{
		name: 'view',
		nameLocalizations: {
			pl: 'wyświetl',
			ro: 'display',
		},
		description: 'Displays a user\'s profile.',
		descriptionLocalizations: {
			pl: 'Wyświetla profil użytkownika.',
			ro: 'Afișează profilul unui utilizator.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		options: [user],
		handle: viewProfile,
	}, {
		name: 'roles',
		nameLocalizations: {
			pl: 'role',
			ro: 'roluri',
		},
		description: 'Opens the role selection menu.',
		descriptionLocalizations: {
			pl: 'Otwiera menu wybierania ról.',
			ro: 'Deschide meniul selectării rolurilor.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: selectRoles,
	}],
};

export default command;
