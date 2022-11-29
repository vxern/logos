import { Expressions } from 'logos/assets/localisations/expressions.ts';
import { Localisations } from 'logos/assets/localisations/utils.ts';

class Misc {
	static readonly client = {
		invalidUser: {
			'English': 'Invalid user.',
			'Polish': 'Nieprawidłowy użytkownik.',
			'Romanian': 'Utilizator nevalid.',
		},
	};

	static readonly time = {
		periods: {
			second: {
				descriptors: {
					'English': ['s', 'sec', 'second', 'seconds'],
					'Polish': ['s', 'sek', 'sekund', 'sekunda', 'sekundy'],
					'Romanian': ['s', 'sec', 'secundă', 'secunde'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'second', 'seconds');

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
					'Polish': ['m', 'min', 'minut', 'minuta', 'minuty'],
					'Romanian': ['m', 'min', 'minut', 'minute'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'minute', 'minutes');

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
					'Polish': ['g', 'godzin', 'godzina', 'godziny'],
					'Romanian': ['o', 'oră', 'ore'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'hour', 'hours');

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
					'Polish': ['d', 'dz', 'dni', 'dzień'],
					'Romanian': ['z', 'zi', 'zile'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'day', 'days');

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
					'Polish': ['t', 'tygodni', 'tydzień', 'tygodnie'],
					'Romanian': ['S', 'săptămână', 'săptămâni'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'week', 'weeks');

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
					'Polish': ['M', 'ms', 'miesięcy', 'miesiąc', 'miesiące'],
					'Romanian': ['l', 'lună', 'luni'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'month', 'months');

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
					'Polish': ['r', 'lat', 'rok', 'lata'],
					'Romanian': ['a', 'an', 'ani'],
				},
				display: {
					'English': (number: number) => {
						const numberExpression = Expressions.english.methods.pluralise(number.toString(), 'year', 'years');

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
		'Polish': 'Kontynuacja na następnej stronie...',
	};
}

export { Misc };
