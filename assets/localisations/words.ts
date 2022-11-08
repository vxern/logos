import { WordTypes } from '../../src/commands/language/data/dictionary.ts';
import { Language } from '../../src/types.ts';
import { getLocale } from './languages.ts';
import { Localisations, localise } from './types.ts';

class Words {
	static readonly types: Record<`${WordTypes}`, Localisations<string>> = {
		[WordTypes.Noun]: {
			'English': 'noun',
			'Polish': 'rzeczownik',
			'Romanian': 'substantiv',
		},
		[WordTypes.Verb]: {
			'English': 'verb',
			'Polish': 'czasownik',
			'Romanian': 'verb',
		},
		[WordTypes.Adjective]: {
			'English': 'adjective',
			'Polish': 'przymiotnik',
			'Romanian': 'adjectiv',
		},
		[WordTypes.Adverb]: {
			'English': 'adverb',
			'Polish': 'przysłówek',
			'Romanian': 'adverb',
		},
		[WordTypes.Adposition]: {
			'English': 'adposition',
			'Polish': 'adpozycja',
			'Romanian': 'adpoziție',
		},
		[WordTypes.Affix]: {
			'English': 'affix',
			'Polish': 'afiks',
			'Romanian': 'afix',
		},
		[WordTypes.Pronoun]: {
			'English': 'pronoun',
			'Polish': 'zaimek',
			'Romanian': 'pronume',
		},
		[WordTypes.Determiner]: {
			'English': 'determiner',
			'Polish': 'określnik',
			'Romanian': 'demonstrativ',
		},
		[WordTypes.Conjunction]: {
			'English': 'conjunction',
			'Polish': 'spójnik',
			'Romanian': 'conjuncție',
		},
		[WordTypes.Interjection]: {
			'English': 'interjection',
			'Polish': 'wykrzyknik',
			'Romanian': 'interjecție',
		},
		[WordTypes.Unknown]: {
			'English': 'part of speech unknown',
			'Polish': 'część mowy nieznana',
			'Romanian': 'parte de vorbire necunoscută',
		},
	};

	static readonly typeNameToType: Localisations<Record<string, WordTypes>> = {
		'English': {},
		'Polish': {},
		'Romanian': {
			'substantiv': WordTypes.Noun,
			'verb': WordTypes.Verb,
			'adjectiv': WordTypes.Adjective,
			'adverb': WordTypes.Adverb,
			'prepoziție': WordTypes.Adposition,
			'postpoziție': WordTypes.Adposition,
			'prefix': WordTypes.Affix,
			'postfix': WordTypes.Affix,
			'pronume': WordTypes.Pronoun,
			'demonstrativ': WordTypes.Determiner,
			'conjuncție': WordTypes.Conjunction,
			'interjecție': WordTypes.Interjection,
		},
	};

	static readonly verbs = {
		moodsAndParticiples: {
			'English': 'Moods and participles',
			'Polish': 'Tryby oraz imiesłowy',
			'Romanian': 'Moduri și participii',
		},
		moods: {
			conditional: {
				'English': 'Conditional',
				'Polish': 'Warunkowy',
				'Romanian': 'Condițional',
			},
			imperative: {
				'English': 'Imperative',
				'Polish': 'Rozkazujący',
				'Romanian': 'Imperativ',
			},
			indicative: {
				'English': 'Indicative',
				'Polish': 'Oznajmujący',
				'Romanian': 'Indicativ',
			},
			infinitive: {
				'English': 'Infinitive',
				'Polish': 'Bezokolicznik',
				'Romanian': 'Infinitiv',
			},
			longInfinitive: {
				'English': 'Long infinitive',
				'Polish': 'Bezokolicznik długi',
				'Romanian': 'Infinitiv lung',
			},
			optative: {
				'English': 'Optative',
				'Polish': 'Życzący',
				'Romanian': 'Optativ',
			},
			presumptive: {
				'English': 'Presumptive',
				'Polish': 'Przypuszczający',
				'Romanian': 'Prezumtiv',
			},
			subjunctive: {
				'English': 'Subjunctive',
				'Polish': 'Łączący',
				'Romanian': 'Conjunctiv',
			},
			supine: {
				'English': 'Supine',
				'Polish': 'Celujący',
				'Romanian': 'Supin',
			},
		},
		participles: {
			present: {
				'English': 'Present participle',
				'Polish': 'Imiesłów przysłówkowy współczesny',
				'Romanian': 'Participiu prezent',
			},
			past: {
				'English': 'Past participle',
				'Polish': 'Imiesłów przymiotnikowy bierny',
				'Romanian': 'Participiu trecut',
			},
		},
		popular: {
			'English': 'popular',
			'Polish': 'popularny',
			'Romanian': 'popular',
		},
		tenses: {
			tenses: {
				'English': 'Tenses',
				'Polish': 'Czasy',
				'Romanian': 'Timpuri',
			},
			present: {
				'English': 'Present',
				'Polish': 'Teraźniejszy',
				'Romanian': 'Prezent',
			},
			presentContinuous: {
				'English': 'Present continuous',
				'Polish': 'Teraźniejszy ciągły',
				'Romanian': 'Prezent continuu',
			},
			imperfect: {
				'English': 'Imperfect',
				'Polish': 'Przeszły niedokonany',
				'Romanian': 'Imperfect',
			},
			preterite: {
				'English': 'Preterite',
				'Polish': 'Przeszły',
				'Romanian': 'Perfect simplu',
			},
			pluperfect: {
				'English': 'Pluperfect',
				'Polish': 'Zaprzeszły',
				'Romanian': 'Mai mult ca perfect',
			},
			perfect: {
				'English': 'Perfect',
				'Polish': 'Dokonany',
				'Romanian': 'Perfect',
			},
			compoundPerfect: {
				'English': 'Compound perfect',
				'Polish': 'Dokonany złożony',
				'Romanian': 'Perfect compus',
			},
			future: {
				'English': 'Future',
				'Polish': 'Przyszły',
				'Romanian': 'Viitor',
			},
			futureCertain: {
				'English': 'Certain future',
				'Polish': 'Przyszły pewny',
				'Romanian': 'Viitor cert',
			},
			futurePlanned: {
				'English': 'Planned future',
				'Polish': 'Przyszły zaplanowany',
				'Romanian': 'Viitor planificat',
			},
			futureDecided: {
				'English': 'Decided future',
				'Polish': 'Przyszły zdecydowany',
				'Romanian': 'Viitor decis',
			},
			futureIntended: {
				'English': 'Intended future',
				'Polish': 'Przyszły zamierzony',
				'Romanian': 'Viitor intenționat',
			},
			futureInThePast: {
				'English': 'Future-in-the-past',
				'Polish': 'Przyszłość w przeszłości',
				'Romanian': 'Viitor în trecut',
			},
			futurePerfect: {
				'English': 'Future perfect',
				'Polish': 'Przyszły dokonany',
				'Romanian': 'Viitor anterior',
			},
		},
	};
}

function getWordType(typeString: string, language: Language): WordTypes {
	return localise(Words.typeNameToType, getLocale(language))[typeString] ?? WordTypes.Unknown;
}

export { getWordType, Words };
