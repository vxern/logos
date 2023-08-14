type PartOfSpeech =
	| "noun"
	| "verb"
	| "adjective"
	| "adverb"
	| "adposition"
	| "article"
	| "proper-noun"
	| "letter"
	| "character"
	| "phrase"
	| "idiom"
	| "symbol"
	| "syllable"
	| "numeral"
	| "initialism"
	| "particle"
	| "punctuation"
	| "affix"
	| "pronoun"
	| "determiner"
	| "conjunction"
	| "interjection"
	| "unknown";

function isUnknownPartOfSpeech(partOfSpeech: PartOfSpeech): partOfSpeech is "unknown" {
	return partOfSpeech === "unknown";
}

export { isUnknownPartOfSpeech };
export type { PartOfSpeech };
