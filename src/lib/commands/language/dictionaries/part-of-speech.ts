import { LearningLanguage } from "../../../../constants/languages";
import partsOfSpeech from "./parts-of-speech";

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

function tryDetectPartOfSpeech(
	search: {
		exact: string;
		approximate?: string;
	},
	sourceLanguage: LearningLanguage,
): PartOfSpeech | undefined {
	const localised = partsOfSpeech[sourceLanguage] as Record<string, PartOfSpeech>;
	if (localised === undefined) {
		return undefined;
	}

	const exactMatch = localised[search.exact];
	if (exactMatch !== undefined) {
		return exactMatch;
	}

	if (search.approximate === undefined) {
		return undefined;
	}

	const approximateMatch = localised[search.approximate];
	if (approximateMatch !== undefined) {
		return approximateMatch;
	}

	return undefined;
}

export { isUnknownPartOfSpeech, tryDetectPartOfSpeech };
export type { PartOfSpeech };
