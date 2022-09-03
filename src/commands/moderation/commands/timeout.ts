import { ApplicationCommandOptionTypes } from '../../../../deps.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import { user } from '../../parameters.ts';
import { duration, reason } from '../parameters.ts';
import { clearTimeout } from './timeout/clear.ts';
import { setTimeout } from './timeout/set.ts';

const command: CommandBuilder = {
	name: 'timeout',
	nameLocalizations: {
		pl: 'timeout',
		ro: 'timeout',
	},
	description: 'Used to manage user timeouts.',
	descriptionLocalizations: {
		pl: 'Komenda używana do zarządzania pauzami użytkowników.',
		ro: 'Comandă utilizată pentru gestionarea pauzelor utilizatorilor.',
	},
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	options: [{
		name: 'set',
		nameLocalizations: {
			pl: 'ustaw',
			ro: 'setare',
		},
		description:
			'Times out a user, making them unable to interact on the server.',
		descriptionLocalizations: {
			pl:
				'Uniemożliwia użytkownikowi interakcjonowanie z serwerem (pisanie, mówienie w VC, itp.).',
			ro: 'Face ca un utilizator să nu mai poată interacționa în server.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		options: [user, duration, reason],
		handle: setTimeout,
	}, {
		name: 'clear',
		nameLocalizations: {
			pl: 'usuń',
			ro: 'ștergere',
		},
		description: 'Clears a user\'s timeout.',
		descriptionLocalizations: {
			pl:
				'Pozwala użytkownikowi, który dostał timeout, ponownie interakcjonować z serwerem.',
			ro:
				'Permite utilizatorului care a primit un timeout să interacționeze cu serverul.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: clearTimeout,
		options: [user],
	}],
};

export default command;
