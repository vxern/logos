class Parameters {
	static readonly global = {
		elements: {
			name: {
				'English': 'number',
				'Hungarian': 'szám',
				'Polish': 'liczba',
				'Romanian': 'număr',
			},
			description: {
				'English': 'The number of elements to manage.',
				'Hungarian': 'A kezelendő elemek mennyisége.',
				'Polish': 'Liczba elementów do zarządzania.',
				'Romanian': 'Numărul de elemente de gestionat.',
			},
		},
		index: {
			name: {
				'English': 'index',
				'Hungarian': 'index',
				'Polish': 'indeks',
				'Romanian': 'index',
			},
			description: {
				'English': 'The index of the element.',
				'Hungarian': 'Az elem indexe.',
				'Polish': 'Indeks elementu.',
				'Romanian': 'Indexul elementului.',
			},
		},
		user: {
			name: {
				'English': 'user',
				'Hungarian': 'felhasználó',
				'Polish': 'użytkownik',
				'Romanian': 'utilizator',
			},
			description: {
				'English': 'The user\'s username, tag, ID or mention.',
				'Hungarian': 'A felhasználó neve, tagje, ID-je vagy megemlítése.',
				'Polish': 'Nazwa użytkownika, jego tag, ID lub wzmianka.',
				'Romanian': 'Numele de utilizator, tag-ul, ID-ul sau mențiunea utilizatorului.',
			},
		},
		show: {
			name: {
				'English': 'show',
				'Hungarian': 'megjelenítés',
				'Polish': 'wyświetl',
				'Romanian': 'afișare',
			},
			description: {
				'English': 'If set to true, the result will be shown to others.',
				'Hungarian': 'Ha igaz, a találatok másoknak is láthatóvá válnak.',
				'Polish': 'Jeśli tak, rezultat będzie wyświetlony innym użytkownikom.',
				'Romanian': 'Dacă da, rezultatul va fi afișat altor utilizatori.',
			},
		},
	};

	static readonly moderation = {
		duration: {
			name: {
				'English': 'duration',
				'Hungarian': 'időtartam',
				'Polish': 'okres',
				'Romanian': 'durată',
			},
			description: {
				'English': 'The duration of the sanction.',
				'Hungarian': 'A szankció időtartama.',
				'Polish': 'Jak długo sankcja ma trwać.',
				'Romanian': 'Durata sancțiunii.',
			},
		},
		reason: {
			name: {
				'English': 'reason',
				'Hungarian': 'ok',
				'Polish': 'powód',
				'Romanian': 'motiv',
			},
			description: {
				'English': 'The reason for the sanction or its repeal. ' +
					'It should be descriptive.',
				'Hungarian': 'A szankciónak vagy visszavonásának oka. ' +
					'Legyen kifejező.',
				'Polish': 'Powód dla sankcji lub dla jej uchylenia. ' +
					'Powinien być szczegółowy.',
				'Romanian': 'Motivul pentru sancțiune sau anularea acesteia. ' +
					'Ar trebui să fie detaliat.',
			},
		},
	};

	static readonly music = {
		index: {
			name: {
				'English': 'index',
				'Hungarian': 'index',
				'Polish': 'indeks',
				'Romanian': 'index',
			},
			description: {
				'English': 'The index of the song listing in the queue.',
				'Hungarian': 'A lejátszási sor egy elemének az indexe.',
				'Polish': 'Indeks wpisu w kolejce.',
				'Romanian': 'Indexul înregistrării în coadă.',
			},
		},
		query: {
			name: {
				'English': 'query',
				'Hungarian': 'lekérés',
				'Polish': 'zapytanie',
				'Romanian': 'interogare',
			},
			description: {
				'English': 'The title or a link to the song or song collection.',
				// TODO: Add Hungarian localisation.
				'Polish': 'Tytuł lub link do utworu lub zbioru utworów.',
				'Romanian': 'Titlul melodiei, link-ul către aceasta sau către unui set de melodii.',
			},
		},
		timestamp: {
			name: {
				'English': 'timestamp',
				'Hungarian': 'különbség',
				'Polish': 'znacznik-czasu',
				'Romanian': 'marcaj-de-timp',
			},
			description: {
				'English': 'The timestamp to seek.',
				// TODO: Add Hungarian translation.
				'Polish': 'Znacznik czasu w piosence, określający dokąd przewinąć.',
				'Romanian': 'Marcajul de timp din cântec la care să se treacă.',
			},
		},
		collection: {
			name: {
				'English': 'collection',
				'Hungarian': 'gyűjtemény',
				'Polish': 'zbiór',
				'Romanian': 'set',
			},
			description: {
				'English': 'If set to true, the action will be taken on the song collection instead.',
				'Hungarian': 'Ha igaz, akkor a művelet a zenegyűjteményen lesz végrehajtva.',
				'Polish': 'Jeśli tak, działanie zostanie wykonane na zbiorze utworów.',
				'Romanian': 'Dacă da, acțiunea va fi efectuată pe set de melodii.',
			},
		},
		by: {
			name: {
				'English': 'by',
				'Hungarian': 'lépték',
				'Polish': 'o',
				'Romanian': 'cu',
			},
			description: {
				'English': 'The number of songs or song listings to skip by.',
				'Hungarian': 'Az átugrandó elemek száma.',
				'Polish': 'Liczba utworów lub wpisów, które mają być przewinięte.',
				'Romanian': 'Numărul de melodii sau de înregistrări care să fie sărite peste.',
			},
		},
		to: {
			name: {
				'English': 'to',
				'Hungarian': 'cél',
				'Polish': 'do',
				'Romanian': 'până-la',
			},
			description: {
				'English': 'The index of the track to skip to.',
				'Hungarian': 'Az ugrás végcéljának indexe.',
				'Polish': 'Indeks utworu lub wpisu do którego przewinąć.',
				'Romanian': 'Indexul melodiei sau al înregistrării până la care să fie sărit peste.',
			},
		},
	};

	static readonly social = {
		roles: {
			name: {
				'English': 'role',
				'Hungarian': 'rang',
				'Polish': 'ranga',
				'Romanian': 'rol',
			},
			description: {
				'English': 'The name of the role.',
				'Hungarian': 'A rang neve.',
				'Polish': 'Nazwa rangi.',
				'Romanian': 'Numele rolului.',
			},
		},
	};
}

export { Parameters };
