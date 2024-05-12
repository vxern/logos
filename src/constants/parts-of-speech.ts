import { LearningLanguage, LocalisationLanguage } from "logos:constants/languages";
import english from "logos:constants/parts-of-speech/english";
import french from "logos:constants/parts-of-speech/french";
import romanian from "logos:constants/parts-of-speech/romanian";

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
	// TODO(vxern): Remove unknown part of speech?
	| "unknown";

const partsOfSpeech = Object.freeze({
	"English/American": english,
	"English/British": english,
	French: french,
	Romanian: romanian,
} satisfies Partial<Record<LocalisationLanguage, Record<string, PartOfSpeech>>>);

function isUnknownPartOfSpeech(partOfSpeech: PartOfSpeech): partOfSpeech is "unknown" {
	return partOfSpeech === "unknown";
}

function getPartOfSpeech({
	terms,
	learningLanguage,
}: { terms: { exact: string; approximate?: string }; learningLanguage: LearningLanguage }): [
	detected: PartOfSpeech,
	original: string,
] {
	if (!(learningLanguage in partsOfSpeech)) {
		return ["unknown", terms.exact];
	}

	const partsOfSpeechLocalised = partsOfSpeech[learningLanguage as keyof typeof partsOfSpeech] as Record<
		string,
		PartOfSpeech
	>;

	if (terms.exact in partsOfSpeechLocalised) {
		return [partsOfSpeechLocalised[terms.exact]!, terms.exact];
	}

	if (terms.approximate !== undefined && terms.approximate in partsOfSpeechLocalised) {
		return [partsOfSpeechLocalised[terms.approximate]!, terms.exact];
	}

	return ["unknown", terms.exact];
}

export { getPartOfSpeech, isUnknownPartOfSpeech };
export type { PartOfSpeech };
