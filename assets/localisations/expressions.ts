import { Language } from 'logos/src/mod.ts';
import { ensureType, TranslationLanguage } from 'logos/assets/localisations/mod.ts';

type TranslationLanguageMappings = Required<
	Record<TranslationLanguage, string>
>;

type LanguageMappings = Required<Record<Language, string>>;

class Expressions {
	static readonly english = {
		methods: {
			pluralise: (
				number: string,
				singular: string,
				plural: string,
			) => {
				if (number === '1') return `${number} ${singular}`;
				return `${number} ${plural}`;
			},
		},
	};

	static readonly polish = {
		cases: {
			// Do not change key names.
			genitive: {
				languages: ensureType<TranslationLanguageMappings>({
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
			pluralise: (
				number: string,
				singular: string,
				plural: string,
				genitive: string,
			) => {
				if (['1', '12', '13', '14'].some((digits) => number === digits)) {
					return `${number} ${singular}`;
				}
				if (['2', '3', '4'].some((digit) => number.endsWith(digit))) {
					return `${number} ${plural}`;
				}
				return `${number} ${genitive}`;
			},
		},
	};

	static readonly romanian = {
		cases: {
			genitive: {
				indefinite: {
					languages: ensureType<LanguageMappings>({
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
			pluralise: (
				number: string,
				singular: string,
				plural: string,
			) => {
				if (number === '1') return `${number} ${singular}`;
				if (
					number.length === 1 || (number.length === 2 && number.at(0) === '1')
				) return `${number} ${plural}`;
				return `${number} de ${plural}`;
			},
		},
	};
}

export { Expressions };
