import type { LearningLanguage } from "logos:constants/languages/learning.ts";
import type { LocalisationLanguage } from "logos:constants/languages/localisation.ts";
import english from "logos:constants/parts-of-speech/english";
import french from "logos:constants/parts-of-speech/french";
import romanian from "logos:constants/parts-of-speech/romanian";

const partsOfSpeech = [
	"noun",
	"verb",
	"adjective",
	"adverb",
	"adposition",
	"article",
	"proper-noun",
	"letter",
	"character",
	"phrase",
	"idiom",
	"symbol",
	"syllable",
	"numeral",
	"initialism",
	"particle",
	"punctuation",
	"affix",
	"pronoun",
	"determiner",
	"conjunction",
	"interjection",
	"unknown",
] as const;
type PartOfSpeech = (typeof partsOfSpeech)[number];

function isPartOfSpeech(partOfSpeech: string): partOfSpeech is PartOfSpeech {
	return (partsOfSpeech as readonly string[]).includes(partOfSpeech);
}

const partsOfSpeechByLanguage = Object.freeze({
	"English/American": english,
	"English/British": english,
	French: french,
	Romanian: romanian,
} satisfies Partial<Record<LocalisationLanguage, Record<string, PartOfSpeech>>>);

function isUnknownPartOfSpeech(partOfSpeech: PartOfSpeech): partOfSpeech is "unknown" {
	return partOfSpeech === "unknown";
}

interface PartOfSpeechDetection {
	readonly detected: PartOfSpeech;
	readonly original: string;
}
function getPartOfSpeech({
	terms,
	learningLanguage,
}: { terms: { exact: string; approximate?: string }; learningLanguage: LearningLanguage }): PartOfSpeechDetection {
	if (isPartOfSpeech(terms.exact)) {
		return { detected: terms.exact, original: terms.exact };
	}

	if (!(learningLanguage in partsOfSpeechByLanguage)) {
		return { detected: "unknown", original: terms.exact };
	}

	const partsOfSpeechLocalised = partsOfSpeechByLanguage[
		learningLanguage as keyof typeof partsOfSpeechByLanguage
	] as Record<string, PartOfSpeech>;

	if (terms.exact in partsOfSpeechLocalised) {
		return { detected: partsOfSpeechLocalised[terms.exact]!, original: terms.exact };
	}

	if (terms.approximate !== undefined && terms.approximate in partsOfSpeechLocalised) {
		return { detected: partsOfSpeechLocalised[terms.approximate]!, original: terms.approximate };
	}

	return { detected: "unknown", original: terms.exact };
}

export { getPartOfSpeech, isUnknownPartOfSpeech };
export type { PartOfSpeech };
