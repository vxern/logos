import { Language } from 'logos/types.ts';
import { TranslationLanguage } from 'logos/assets/localisations/utils.ts';
import { ensureType } from 'logos/assets/localisations/utils.ts';

class Expressions {
	static readonly english = {
		methods: {
			pluralise: (number: string, singular: string, plural: string) => {
				// 1 is the only number the singular form goes with in English.
				if (number === '1') return `${number} ${singular}`;

				return `${number} ${plural}`;
			},
		},
	};

	static readonly polish = {
		cases: {
			// Do not change key names.
			genitive: {
				languages: ensureType<Required<Record<TranslationLanguage, string>>>({
					'Armenian': 'Ormiańskiego',
					'Belarusian': 'Białoruskiego',
					'Bulgarian': 'Bułgarskiego',
					'Chinese': 'Chińskiego',
					'Chinese (simplified)': 'Chińskiego (Uproszczonego)',
					'Czech': 'Czeskiego',
					'Danish': 'Duńskiego',
					'Dutch': 'Niderlandzkiego',
					'English': 'Angielskiego',
					'English (American)': 'Angielskiego (Amerykańskiego)',
					'English (British)': 'Angielskiego (Brytyjskiego)',
					'Estonian': 'Estońskiego',
					'Finnish': 'Fińskiego',
					'French': 'Francuskiego',
					'German': 'Niemieckiego',
					'Greek': 'Greckiego',
					'Hungarian': 'Węgierskiego',
					'Indonesian': 'Indonezyjskiego',
					'Italian': 'Włoskiego',
					'Japanese': 'Japońskiego',
					'Latvian': 'Łotewskiego',
					'Lithuanian': 'Litewskiego',
					'Polish': 'Polskiego',
					'Portuguese': 'Portugalskiego',
					'Portuguese (Brazilian)': 'Portugalskiego (Brazylijskiego)',
					'Portuguese (European)': 'Portugalskiego (Europejskiego)',
					'Romanian': 'Rumuńskiego',
					'Russian': 'Rosyjskiego',
					'Slovak': 'Słowackiego',
					'Slovenian': 'Słoweńskiego',
					'Spanish': 'Hiszpańskiego',
					'Swedish': 'Szwedzkiego',
					'Turkish': 'Tureckiego',
					'Ukrainian': 'Ukraińskiego',
				}),
			},
			instrumental: {
				languages: {
					'Armenian': 'ormiańskim',
					'Belarusian': 'białoruskim',
					'English': 'angielskim',
					'Polish': 'polskim',
					'Romanian': 'rumuńskim',
				},
			},
		},
		methods: {
			pluralise: (number: string, singular: string, plural: string, genitive: string) => {
				// 1 is the only number the singular form goes with in Polish.
				if (number === '1') return `${number} ${singular}`;

				// Numbers 12, 13 and 14 and other numbers ending in them are followed by the plural genitive.
				if (['12', '13', '14'].some((digits) => number.endsWith(digits))) return `${number} ${genitive}`;

				// Numbers ending in 2, 3 and 4
				if (['2', '3', '4'].some((digit) => number.endsWith(digit))) return `${number} ${plural}`;

				return `${number} ${genitive}`;
			},
		},
	};

	static readonly romanian = {
		cases: {
			genitive: {
				indefinite: {
					languages: ensureType<Required<Record<Language, string>>>({
						'Armenian': 'armene',
						'Belarusian': 'belaruse',
						'English': 'engleze',
						'Polish': 'poloneze',
						'Romanian': 'române',
					}),
				},
			},
		},
		methods: {
			pluralise: (number: string, singular: string, plural: string) => {
				// 1 is the only number the singular form goes with in Romanian.
				if (number === '1') return `${number} ${singular}`;

				// Until the number 20, Romanian nouns follow the standard number + plural rule.
				if (Number(number) < 20) return `${number} ${plural}`;

				// Once the number reaches 20, Romanian begins slotting a 'de' between the number and the plural form of the word.
				return `${number} de ${plural}`;
			},
		},
	};
}

export { Expressions };
