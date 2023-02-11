import { Localisations } from 'logos/assets/localisations/utils.ts';
import { WordClasses } from 'logos/types.ts';

class Words {
	static readonly classes: Record<`${WordClasses}`, Localisations<string>> = {
		[WordClasses.Noun]: {
			'English': 'noun',
			'Hungarian': 'főnév',
			'Polish': 'rzeczownik',
			'Romanian': 'substantiv',
		},
		[WordClasses.Verb]: {
			'English': 'verb',
			'Hungarian': 'ige',
			'Polish': 'czasownik',
			'Romanian': 'verb',
		},
		[WordClasses.Adjective]: {
			'English': 'adjective',
			'Hungarian': 'melléknév',
			'Polish': 'przymiotnik',
			'Romanian': 'adjectiv',
		},
		[WordClasses.Adverb]: {
			'English': 'adverb',
			'Hungarian': 'határozószó',
			'Polish': 'przysłówek',
			'Romanian': 'adverb',
		},
		[WordClasses.Adposition]: {
			'English': 'adposition',
			'Hungarian': 'adpozíció',
			'Polish': 'adpozycja',
			'Romanian': 'adpoziție',
		},
		[WordClasses.Affix]: {
			'English': 'affix',
			'Hungarian': 'affix',
			'Polish': 'afiks',
			'Romanian': 'afix',
		},
		[WordClasses.Pronoun]: {
			'English': 'pronoun',
			'Hungarian': 'névmás',
			'Polish': 'zaimek',
			'Romanian': 'pronume',
		},
		[WordClasses.Determiner]: {
			'English': 'determiner',
			'Polish': 'określnik',
			'Romanian': 'demonstrativ',
		},
		[WordClasses.Conjunction]: {
			'English': 'conjunction',
			'Hungarian': 'kötőszó',
			'Polish': 'spójnik',
			'Romanian': 'conjuncție',
		},
		[WordClasses.Interjection]: {
			'English': 'interjection',
			'Hungarian': 'indulatszó',
			'Polish': 'wykrzyknik',
			'Romanian': 'interjecție',
		},
		[WordClasses.Unknown]: {
			'English': 'part of speech unknown',
			'Hungarian': 'ismeretlen szófaj',
			'Polish': 'część mowy nieznana',
			'Romanian': 'parte de vorbire necunoscută',
		},
	};

	static readonly typeNameToType: Localisations<Record<string, WordClasses>> = {
		'English': {},
		'Romanian': {
			'substantiv': WordClasses.Noun,
			'substantiv masculin': WordClasses.Noun,
			'substantiv feminin': WordClasses.Noun,
			'substantiv neutru': WordClasses.Noun,
			'substantiv propriu': WordClasses.Noun,
			'verb': WordClasses.Verb,
			'adjectiv': WordClasses.Adjective,
			'adjectiv pronominal': WordClasses.Determiner,
			'adverb': WordClasses.Adverb,
			'prepoziție': WordClasses.Adposition,
			'postpoziție': WordClasses.Adposition,
			'prefix': WordClasses.Affix,
			'postfix': WordClasses.Affix,
			'pronume': WordClasses.Pronoun,
			'demonstrativ': WordClasses.Determiner,
			'conjuncție': WordClasses.Conjunction,
			'interjecție': WordClasses.Interjection,
		},
	};
}

export { Words };
