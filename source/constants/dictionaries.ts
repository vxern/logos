import type { LearningLanguage } from "logos:constants/languages/learning";

type Dictionary = "dexonline" | "dicolink" | "wiktionary" | "wordnik" | "words-api";

const dictionariesByLanguage = Object.freeze({
	"Armenian/Eastern": ["wiktionary"],
	"Armenian/Western": ["wiktionary"],
	Danish: ["wiktionary"],
	Dutch: ["wiktionary"],
	"English/American": ["wiktionary", "wordnik", "words-api"],
	"English/British": ["wiktionary", "wordnik", "words-api"],
	Finnish: ["wiktionary"],
	French: ["dicolink", "wiktionary"],
	German: ["wiktionary"],
	Greek: ["wiktionary"],
	Hungarian: ["wiktionary"],
	"Norwegian/Bokmal": ["wiktionary"],
	Polish: ["wiktionary"],
	Romanian: ["dexonline", "wiktionary"],
	Russian: ["wiktionary"],
	Silesian: ["wiktionary"],
	Spanish: ["wiktionary"],
	Swedish: ["wiktionary"],
	Turkish: ["wiktionary"],
} satisfies Record<LearningLanguage, Dictionary[]> as Record<LearningLanguage, Dictionary[]>);

export default Object.freeze({ languages: dictionariesByLanguage });
export type { Dictionary };
