import { DiscordLocalisations } from './types.ts';

function typedLocalisations<OptionKeys extends string>(
	localisations: Record<OptionKeys, DiscordLocalisations>,
): Record<OptionKeys, DiscordLocalisations> {
	return localisations;
}

class Parameters {
	static readonly global = typedLocalisations({
		elements: {
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
		},
		index: {
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
		},
		user: {
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
		},
		show: {
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
		},
	});

	static readonly moderation = typedLocalisations({
		duration: {
			name: {
				'English': 'duration',
				'Polish': 'okres',
				'Romanian': 'durată',
			},
			description: {
				'English': 'The duration of the sanction.',
				'Polish': 'Jak długo sankcja ma trwać.',
				'Romanian': 'Durata sancțiunii.',
			},
		},
		reason: {
			name: {
				'English': 'reason',
				'Polish': 'powód',
				'Romanian': 'motiv',
			},
			description: {
				'English':
					'The reason for the sanction or its repeal. It should be descriptive.',
				'Polish':
					'Powód dla sankcji lub dla jej uchylenia. Powinien być szczegółowy.',
				'Romanian':
					'Motivul pentru sancțiune sau anularea acesteia. Ar trebui să fie detaliat.',
			},
		},
	});
}

export { Parameters };
