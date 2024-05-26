import type { LearningLanguage } from "logos:constants/languages";

type Dictionary = "dexonline" | "dicolink" | "wiktionary" | "words-api";

const dictionariesByLanguage = Object.freeze({
	"Armenian/Eastern": ["wiktionary"],
	"Armenian/Western": ["wiktionary"],
	Danish: ["wiktionary"],
	Dutch: ["wiktionary"],
	"English/American": ["wiktionary", "words-api"],
	"English/British": ["wiktionary", "words-api"],
	Finnish: ["wiktionary"],
	French: ["dicolink", "wiktionary"],
	German: ["wiktionary"],
	Greek: ["wiktionary"],
	Hungarian: ["wiktionary"],
	"Norwegian/Bokmål": ["wiktionary"],
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
