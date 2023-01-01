import { Localisations } from 'logos/assets/localisations/utils.ts';
import { WordTypes } from 'logos/types.ts';

class Words {
	static readonly types: Record<`${WordTypes}`, Localisations<string>> = {
		[WordTypes.Noun]: {
			'English': 'noun',
			'Hungarian': 'főnév',
			'Polish': 'rzeczownik',
			'Romanian': 'substantiv',
		},
		[WordTypes.Verb]: {
			'English': 'verb',
			'Hungarian': 'ige',
			'Polish': 'czasownik',
			'Romanian': 'verb',
		},
		[WordTypes.Adjective]: {
			'English': 'adjective',
			'Hungarian': 'melléknév',
			'Polish': 'przymiotnik',
			'Romanian': 'adjectiv',
		},
		[WordTypes.Adverb]: {
			'English': 'adverb',
			'Hungarian': 'határozószó',
			'Polish': 'przysłówek',
			'Romanian': 'adverb',
		},
		[WordTypes.Adposition]: {
			'English': 'adposition',
			'Hungarian': 'adpozíció',
			'Polish': 'adpozycja',
			'Romanian': 'adpoziție',
		},
		[WordTypes.Affix]: {
			'English': 'affix',
			'Hungarian': 'affix',
			'Polish': 'afiks',
			'Romanian': 'afix',
		},
		[WordTypes.Pronoun]: {
			'English': 'pronoun',
			'Hungarian': 'névmás',
			'Polish': 'zaimek',
			'Romanian': 'pronume',
		},
		[WordTypes.Determiner]: {
			'English': 'determiner',
			// TODO: Add Hungarian localisation.
			'Polish': 'określnik',
			'Romanian': 'demonstrativ',
		},
		[WordTypes.Conjunction]: {
			'English': 'conjunction',
			'Hungarian': 'kötőszó',
			'Polish': 'spójnik',
			'Romanian': 'conjuncție',
		},
		[WordTypes.Interjection]: {
			'English': 'interjection',
			'Hungarian': 'indulatszó',
			'Polish': 'wykrzyknik',
			'Romanian': 'interjecție',
		},
		[WordTypes.Unknown]: {
			'English': 'part of speech unknown',
			'Hungarian': 'ismeretlen szófaj',
			'Polish': 'część mowy nieznana',
			'Romanian': 'parte de vorbire necunoscută',
		},
	};

	static readonly typeNameToType: Localisations<Record<string, WordTypes>> = {
		'English': {},
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

export { Words };
