import { CommandLocalisations, DiscordLocalisations } from './types.ts';

class GlobalParameters {
	static readonly elements: DiscordLocalisations = {
		name: {
			'English': 'number',
			'Polish': 'liczba',
			'Romanian': 'număr',
		},
		description: {
			'English': 'The number of elements to manage.',
			'Polish': 'Liczba elementów do zarządzania.',
			'Romanian': 'Numărul de elemente de gestionat.',
		},
	};

	static readonly index: DiscordLocalisations = {
		name: {
			'English': 'index',
			'Polish': 'indeks',
			'Romanian': 'index',
		},
		description: {
			'English': 'The index of the element.',
			'Polish': 'Indeks elementu.',
			'Romanian': 'Indexul elementului.',
		},
	};

	static readonly user: DiscordLocalisations = {
		name: {
			'English': 'user',
			'Polish': 'użytkownik',
			'Romanian': 'utilizator',
		},
		description: {
			'English': 'The user\'s username, tag, ID or mention.',
			'Polish': 'Nazwa użytkownika, jego tag, ID lub wzmianka.',
			'Romanian':
				'Numele de utilizator, tag-ul, ID-ul sau mențiunea utilizatorului.',
		},
	};

	static readonly show: DiscordLocalisations = {
		name: {
			'English': 'show',
			'Polish': 'wyświetl',
			'Romanian': 'afișare',
		},
		description: {
			'English': 'If set to true, the result will be shown to others.',
			'Polish': 'Jeśli tak, rezultat będzie wyświetlony innym użytkownikom.',
			'Romanian': 'Dacă da, rezultatul va fi afișat altor utilizatori.',
		},
	};
}

class Commands {
	static readonly information: CommandLocalisations<'bot' | 'guild'> = {
		name: {
			'English': 'information',
			'Polish': 'informacje',
			'Romanian': 'informații',
		},
		description: {
			'English': 'Used to display various information.',
			'Polish': 'Komenda używania do wyświetlania różnych informacji.',
			'Romanian': 'Comandă utilizată pentru afișarea diverselor informații.',
		},
		options: {
			bot: {
				name: {
					'English': 'bot',
					'Polish': 'bot',
					'Romanian': 'bot',
				},
				description: {
					'English': 'Displays information about the bot.',
					'Polish': 'Wyświetla informacje o bocie.',
					'Romanian': 'Afișează informații despre bot.',
				},
			},
			guild: {
				name: {
					'English': 'server',
					'Polish': 'serwer',
					'Romanian': 'server',
				},
				description: {
					'English': 'Displays information about the server.',
					'Polish': 'Wyświetla informacje o serwerze.',
					'Romanian': 'Afișează informații despre server.',
				},
			},
		},
	};
}

export { Commands, GlobalParameters };
