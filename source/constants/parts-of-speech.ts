import type { LearningLanguage } from "logos:constants/languages/learning";
import type { LocalisationLanguage } from "logos:constants/languages/localisation";
import english from "logos:constants/parts-of-speech/english";
import french from "logos:constants/parts-of-speech/french";
import romanian from "logos:constants/parts-of-speech/romanian";

const partsOfSpeech = [
	"adposition",
	"number",
	"noun",
	"verb",
	"adjective",
	"adverb",
	"adposition",
	"ambiposition",
	"circumposition",
	"preposition",
	"postposition",
	"circumfix",
	"classifier",
	"article",
	"proper-noun",
	"letter",
	"character",
	"phrase",
	"proverb",
	"idiom",
	"symbol",
	"syllable",
	"numeral",
	"initialism",
	"particle",
	"punctuation",
	"punctuation-mark",
	"affix",
	"infix",
	"prefix",
	"root",
	"interfix",
	"suffix",
	"combining-form",
	"diacritical-mark",
	"prepositional-phrase",
	"han-character",
	"hanzi",
	"kanji",
	"hanja",
	"romanization",
	"logogram",
	"determinative",
	"pronoun",
	"determiner",
	"conjunction",
	"interjection",
	"contraction",
	"counter",
	"ideophone",
	"participle",
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

export { getPartOfSpeech };
export type { PartOfSpeech };
