import { DiscordLocalisations } from './types.ts';

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

export { GlobalParameters };
