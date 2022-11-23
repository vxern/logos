import { getLocale, Localisations, localise } from 'logos/assets/localisations/mod.ts';
import { WordTypes } from 'logos/src/commands/language/data/mod.ts';
import { Language } from 'logos/types.ts';

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
			'substantiv masculin': WordTypes.Noun,
			'substantiv feminin': WordTypes.Noun,
			'substantiv neutru': WordTypes.Noun,
			'substantiv propriu': WordTypes.Noun,
			'verb': WordTypes.Verb,
			'adjectiv': WordTypes.Adjective,
			'adjectiv pronominal': WordTypes.Determiner,
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
}

function getWordType(typeString: string, language: Language): WordTypes {
	return localise(Words.typeNameToType, getLocale(language))[typeString] ?? WordTypes.Unknown;
}

export { getWordType, Words };
