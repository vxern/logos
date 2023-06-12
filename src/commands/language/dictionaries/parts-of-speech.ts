import { Language } from 'logos/types.ts';

type PartOfSpeech =
	| 'noun'
	| 'verb'
	| 'adjective'
	| 'adverb'
	| 'adposition'
	| 'article'
	| 'proper noun'
	| 'letter'
	| 'character'
	| 'phrase'
	| 'idiom'
	| 'symbol'
	| 'syllable'
	| 'numeral'
	| 'initialism'
	| 'particle'
	| 'punctuation'
	| 'affix'
	| 'pronoun'
	| 'determiner'
	| 'conjunction'
	| 'interjection'
	| 'unknown';

const partOfSpeechToStringKey: Record<PartOfSpeech, string> = {
	'noun': 'words.noun',
	'verb': 'words.verb',
	'adjective': 'words.adjective',
	'adverb': 'words.adverb',
	'adposition': 'words.adposition',
	'article': 'words.article',
	'proper noun': 'words.properNoun',
	'letter': 'words.letter',
	'character': 'words.character',
	'phrase': 'words.phrase',
	'idiom': 'words.idiom',
	'symbol': 'words.symbol',
	'syllable': 'words.syllable',
	'numeral': 'words.numeral',
	'initialism': 'words.initialism',
	'particle': 'words.particle',
	'punctuation': 'words.punctuation',
	'affix': 'words.affix',
	'pronoun': 'words.pronoun',
	'determiner': 'words.determiner',
	'conjunction': 'words.conjunction',
	'interjection': 'words.interjection',
	'unknown': 'words.unknown',
};

function isUnknownPartOfSpeech(partOfSpeech: PartOfSpeech): partOfSpeech is 'unknown' {
	return partOfSpeech === 'unknown';
}

const partsOfSpeech: Partial<Record<Language, Record<string, PartOfSpeech>>> = {
	'English': {
		'adjective': 'adjective',
		'adposition': 'adposition',
		'preposition': 'adposition',
		'postposition': 'adposition',
		'adverb': 'adverb',
		'affix': 'affix',
		'prefix': 'affix',
		'suffix': 'affix',
		'infix': 'affix',
		'interfix': 'affix',
		'article': 'article',
		'proper noun': 'proper noun',
		'letter': 'letter',
		'character': 'character',
		'phrase': 'phrase',
		'idiom': 'idiom',
		'symbol': 'symbol',
		'syllable': 'syllable',
		'numeral': 'numeral',
		'initialism': 'initialism',
		'particle': 'particle',
		'punctuation mark': 'punctuation',
		'conjunction': 'conjunction',
		'determiner': 'determiner',
		'interjection': 'interjection',
		'noun': 'noun',
		'pronoun': 'pronoun',
		'unknown': 'unknown',
		'verb': 'verb',
	} satisfies Record<PartOfSpeech, PartOfSpeech> | Record<string, PartOfSpeech>,
	'Romanian': {
		'substantiv': 'noun',
		'substantiv masculin': 'noun',
		'substantiv feminin': 'noun',
		'substantiv neutru': 'noun',
		'substantiv propriu': 'noun',
		'verb': 'verb',
		'adjectiv': 'adjective',
		'adjectiv pronominal': 'determiner',
		'adverb': 'adverb',
		'prepoziție': 'adposition',
		'postpoziție': 'adposition',
		'prefix': 'affix',
		'postfix': 'affix',
		'pronume': 'pronoun',
		'pronume reflexiv': 'pronoun',
		'demonstrativ': 'determiner',
		'conjuncție': 'conjunction',
		'interjecție': 'interjection',
	},
};

export default partsOfSpeech;
export { isUnknownPartOfSpeech, partOfSpeechToStringKey };
export type { PartOfSpeech };
