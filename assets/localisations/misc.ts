import { Expressions } from 'logos/assets/localisations/expressions.ts';
import { Expression, Localisations } from 'logos/assets/localisations/utils.ts';

class Misc {
	static readonly client = {
		invalidUser: {
			'English': 'Invalid user.',
			'Hungarian': 'Érvénytelen felhasználó.',
			'Polish': 'Nieprawidłowy użytkownik.',
			'Romanian': 'Utilizator nevalid.',
		},
	};

	static readonly time = {
		periods: {
			second: {
				descriptors: {
					'English': ['s', 'sec', 'second', 'seconds'],
					'Hungarian': ['m', 'mp', 'másodperc'],
					'Polish': ['s', 'sek', 'sekund', 'sekunda', 'sekundy'],
					'Romanian': ['s', 'sec', 'secundă', 'secunde'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'second', 'seconds');

						return numberExpression;
					},
					'Hungarian': (number: number) => {
						const numberExpression = `${number} másodperc`;

						return numberExpression;
					},
					'Polish': (number: number) => {
						const numberExpression = Expressions.polish.methods.pluralise(
							number.toString(),
							'sekunda',
							'sekundy',
							'sekund',
						);

						return numberExpression;
					},
					'Romanian': (number: number) => {
						const numberExpression = Expressions.romanian.methods.pluralise(number.toString(), 'secundă', 'secunde');

						return numberExpression;
					},
				},
			},
			minute: {
				descriptors: {
					'English': ['m', 'min', 'minute', 'mins', 'minutes'],
					'Hungarian': ['p', 'perc'],
					'Polish': ['m', 'min', 'minut', 'minuta', 'minuty'],
					'Romanian': ['m', 'min', 'minut', 'minute'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'minute', 'minutes');

						return numberExpression;
					},
					'Hungarian': (number: number) => {
						const numberExpression = `${number} perc`;

						return numberExpression;
					},
					'Polish': (number: number) => {
						const numberExpression = Expressions.polish.methods.pluralise(
							number.toString(),
							'minuta',
							'minuty',
							'minut',
						);

						return numberExpression;
					},
					'Romanian': (number: number) => {
						const numberExpression = Expressions.romanian.methods.pluralise(number.toString(), 'minut', 'minute');

						return numberExpression;
					},
				},
			},
			hour: {
				descriptors: {
					'English': ['h', 'hr', 'hour', 'hrs', 'hours'],
					'Hungarian': ['ó', 'óra'],
					'Polish': ['g', 'godzin', 'godzina', 'godziny'],
					'Romanian': ['o', 'oră', 'ore'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'hour', 'hours');

						return numberExpression;
					},
					'Hungarian': (number: number) => {
						const numberExpression = `${number} óra`;

						return numberExpression;
					},
					'Polish': (number: number) => {
						const numberExpression = Expressions.polish.methods.pluralise(
							number.toString(),
							'godzina',
							'godziny',
							'godzin',
						);

						return numberExpression;
					},
					'Romanian': (number: number) => {
						const numberExpression = Expressions.romanian.methods.pluralise(number.toString(), 'oră', 'ore');

						return numberExpression;
					},
				},
			},
			day: {
				descriptors: {
					'English': ['d', 'day', 'days'],
					'Hungarian': ['n', 'nap'],
					'Polish': ['d', 'dz', 'dni', 'dzień'],
					'Romanian': ['z', 'zi', 'zile'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'day', 'days');

						return numberExpression;
					},
					'Hungarian': (number: number) => {
						const numberExpression = `${number} nap`;

						return numberExpression;
					},
					'Polish': (number: number) => {
						const numberExpression = Expressions.polish.methods.pluralise(
							number.toString(),
							'dzień',
							'dni',
							'dni',
						);

						return numberExpression;
					},
					'Romanian': (number: number) => {
						const numberExpression = Expressions.romanian.methods.pluralise(number.toString(), 'zi', 'zile');

						return numberExpression;
					},
				},
			},
			week: {
				descriptors: {
					'English': ['w', 'wk', 'week', 'wks', 'weeks'],
					'Hungarian': ['h', 'hét'],
					'Polish': ['t', 'tygodni', 'tydzień', 'tygodnie'],
					'Romanian': ['S', 'săptămână', 'săptămâni'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'week', 'weeks');

						return numberExpression;
					},
					'Hungarian': (number: number) => {
						const numberExpression = `${number} hét`;

						return numberExpression;
					},
					'Polish': (number: number) => {
						const numberExpression = Expressions.polish.methods.pluralise(
							number.toString(),
							'tydzień',
							'tygodnie',
							'tygodni',
						);

						return numberExpression;
					},
					'Romanian': (number: number) => {
						const numberExpression = Expressions.romanian.methods.pluralise(
							number.toString(),
							'săptămână',
							'săptămâni',
						);

						return numberExpression;
					},
				},
			},
			month: {
				descriptors: {
					'English': ['M', 'mth', 'month', 'mths', 'months'],
					'Hungarian': ['H', 'hónap'],
					'Polish': ['M', 'ms', 'miesięcy', 'miesiąc', 'miesiące'],
					'Romanian': ['l', 'lună', 'luni'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'month', 'months');

						return numberExpression;
					},
					'Hungarian': (number: number) => {
						const numberExpression = `${number} hónap`;

						return numberExpression;
					},
					'Polish': (number: number) => {
						const numberExpression = Expressions.polish.methods.pluralise(
							number.toString(),
							'miesiąc',
							'miesiące',
							'miesięcy',
						);

						return numberExpression;
					},
					'Romanian': (number: number) => {
						const numberExpression = Expressions.romanian.methods.pluralise(number.toString(), 'lună', 'luni');

						return numberExpression;
					},
				},
			},
			year: {
				descriptors: {
					'English': ['y', 'yr', 'year', 'yrs', 'years'],
					'Hungarian': ['é', 'év'],
					'Polish': ['r', 'lat', 'rok', 'lata'],
					'Romanian': ['a', 'an', 'ani'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'year', 'years');

						return numberExpression;
					},
					'Hungarian': (number: number) => {
						const numberExpression = `${number} év`;

						return numberExpression;
					},
					'Polish': (number: number) => {
						const numberExpression = Expressions.polish.methods.pluralise(
							number.toString(),
							'rok',
							'lata',
							'lat',
						);

						return numberExpression;
					},
					'Romanian': (number: number) => {
						const numberExpression = Expressions.romanian.methods.pluralise(number.toString(), 'an', 'ani');

						return numberExpression;
					},
				},
			},
		},
	};

	static readonly continuedOnNextPage: Localisations<string> = {
		'English': 'Continued on the next page...',
		'Hungarian': 'Folytatódik a következő oldalon...',
		'Polish': 'Kontynuacja na następnej stronie...',
		'Romanian': 'Continuare pe următoarea pagină...',
	};

	static readonly page: Localisations<string> = {
		'English': 'Page',
		'Polish': 'Strona',
		'Romanian': 'Pagina',
	};

	static readonly usedCommandTooManyTimes: Localisations<Expression<string>> = {
		'English': (timestamp: string) =>
			'You have used this command too many times in too short of time.\n\n' +
			`You will be able to use the command again ${timestamp}.`,
		'Polish': (timestamp: string) =>
			'Użyłeś/aś polecenia zbyt wiele razy w zbyt krótkim czasie.\n\n' +
			`Będziesz mógł/mogła ponownie użyć polecenia ${timestamp}.`,
		'Romanian': (timestamp: string) =>
			'Ai folosit comanda de prea multe ori într-un timp prea scurt.\n\n' +
			`Vei putea folosi comanda din nou ${timestamp}.`,
	};
}

export { Misc };
