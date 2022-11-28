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
					'English': (number: number) => Expressions.english.methods.pluralise(number.toString(), 'second', 'seconds'),
					'Polish': (number: number) =>
						Expressions.polish.methods.pluralise(number.toString(), 'sekunda', 'sekundy', 'sekund'),
					'Romanian': (number: number) =>
						Expressions.romanian.methods.pluralise(
							number.toString(),
							'secundă',
							'secunde',
						),
				},
			},
			minute: {
				descriptors: {
					'English': ['m', 'min', 'minute', 'mins', 'minutes'],
					'Polish': ['m', 'min', 'minut', 'minuta', 'minuty'],
					'Romanian': ['m', 'min', 'minut', 'minute'],
				},
				display: {
					'English': (number: number) =>
						Expressions.english.methods.pluralise(
							number.toString(),
							'minute',
							'minutes',
						),
					'Polish': (number: number) =>
						Expressions.polish.methods.pluralise(
							number.toString(),
							'minuta',
							'minuty',
							'minut',
						),
					'Romanian': (number: number) =>
						Expressions.romanian.methods.pluralise(
							number.toString(),
							'minut',
							'minute',
						),
				},
			},
			hour: {
				descriptors: {
					'English': ['h', 'hr', 'hour', 'hrs', 'hours'],
					'Polish': ['g', 'godzin', 'godzina', 'godziny'],
					'Romanian': ['o', 'oră', 'ore'],
				},
				display: {
					'English': (number: number) =>
						Expressions.english.methods.pluralise(
							number.toString(),
							'hour',
							'hours',
						),
					'Polish': (number: number) =>
						Expressions.polish.methods.pluralise(
							number.toString(),
							'godzina',
							'godziny',
							'godzin',
						),
					'Romanian': (number: number) =>
						Expressions.romanian.methods.pluralise(
							number.toString(),
							'oră',
							'ore',
						),
				},
			},
			day: {
				descriptors: {
					'English': ['d', 'day', 'days'],
					'Polish': ['d', 'dz', 'dni', 'dzień'],
					'Romanian': ['z', 'zi', 'zile'],
				},
				display: {
					'English': (number: number) =>
						Expressions.english.methods.pluralise(
							number.toString(),
							'day',
							'days',
						),
					'Polish': (number: number) =>
						Expressions.polish.methods.pluralise(
							number.toString(),
							'dzień',
							'dni',
							'dni',
						),
					'Romanian': (number: number) =>
						Expressions.romanian.methods.pluralise(
							number.toString(),
							'zi',
							'zile',
						),
				},
			},
			week: {
				descriptors: {
					'English': ['w', 'wk', 'week', 'wks', 'weeks'],
					'Polish': ['t', 'tygodni', 'tydzień', 'tygodnie'],
					'Romanian': ['S', 'săptămână', 'săptămâni'],
				},
				display: {
					'English': (number: number) =>
						Expressions.english.methods.pluralise(
							number.toString(),
							'week',
							'weeks',
						),
					'Polish': (number: number) =>
						Expressions.polish.methods.pluralise(
							number.toString(),
							'tydzień',
							'tygodnie',
							'tygodni',
						),
					'Romanian': (number: number) =>
						Expressions.romanian.methods.pluralise(
							number.toString(),
							'săptămână',
							'săptămâni',
						),
				},
			},
			month: {
				descriptors: {
					'English': ['M', 'mth', 'month', 'mths', 'months'],
					'Polish': ['M', 'ms', 'miesięcy', 'miesiąc', 'miesiące'],
					'Romanian': ['l', 'lună', 'luni'],
				},
				display: {
					'English': (number: number) =>
						Expressions.english.methods.pluralise(
							number.toString(),
							'month',
							'months',
						),
					'Polish': (number: number) =>
						Expressions.polish.methods.pluralise(
							number.toString(),
							'miesiąc',
							'miesiące',
							'miesięcy',
						),
					'Romanian': (number: number) =>
						Expressions.romanian.methods.pluralise(
							number.toString(),
							'lună',
							'luni',
						),
				},
			},
			year: {
				descriptors: {
					'English': ['y', 'yr', 'year', 'yrs', 'years'],
					'Polish': ['r', 'lat', 'rok', 'lata'],
					'Romanian': ['a', 'an', 'ani'],
				},
				display: {
					'English': (number: number) =>
						Expressions.english.methods.pluralise(
							number.toString(),
							'year',
							'years',
						),
					'Polish': (number: number) =>
						Expressions.polish.methods.pluralise(
							number.toString(),
							'rok',
							'lata',
							'lat',
						),
					'Romanian': (number: number) =>
						Expressions.romanian.methods.pluralise(
							number.toString(),
							'an',
							'ani',
						),
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
