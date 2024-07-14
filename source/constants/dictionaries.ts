import type { LearningLanguage } from "logos:constants/languages/learning";

const sections = [
	"partOfSpeech",
	"definitions",
	"translations",
	"relations",
	"syllables",
	"pronunciation",
	"rhymes",
	"audio",
	"expressions",
	"examples",
	"frequency",
	"inflection",
	"etymology",
	"notes",
] as const;
type DictionarySection = (typeof sections)[number];

type Dictionary = "dexonline" | "dicolink" | "pons" | "wiktionary" | "wordnik" | "words-api";

const dictionariesByLanguage = Object.freeze({
	"Armenian/Eastern": ["wiktionary"],
	"Armenian/Western": ["wiktionary"],
	Danish: ["wiktionary"],
	Dutch: ["wiktionary"],
	"English/American": ["wiktionary", "wordnik", "words-api"],
	"English/British": ["wiktionary", "wordnik", "words-api"],
	Finnish: ["wiktionary"],
	French: ["dicolink", "wiktionary"],
	German: ["pons", "wiktionary"],
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
export type { Dictionary, DictionarySection };
