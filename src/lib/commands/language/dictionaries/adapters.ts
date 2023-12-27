import { LearningLanguage } from "../../../../constants/languages";
import { DictionaryAdapter } from "./adapter";
import dexonline from "./adapters/dexonline";
import dicolink from "./adapters/dicolink";
import wiktionary from "./adapters/wiktionary";
import wordsApi from "./adapters/words-api";

export default {
	"Armenian/Eastern": [wiktionary],
	"Armenian/Western": [wiktionary],
	Danish: [wiktionary],
	Dutch: [wiktionary],
	"English/American": [wiktionary, wordsApi],
	"English/British": [wiktionary, wordsApi],
	Finnish: [wiktionary],
	French: [dicolink, wiktionary],
	German: [wiktionary],
	Greek: [wiktionary],
	Hungarian: [wiktionary],
	"Norwegian/Bokmål": [wiktionary],
	Polish: [wiktionary],
	Romanian: [dexonline, wiktionary],
	Russian: [wiktionary],
	Silesian: [wiktionary],
	Spanish: [wiktionary],
	Swedish: [wiktionary],
	Turkish: [wiktionary],
} satisfies Record<LearningLanguage, DictionaryAdapter[]> as Record<LearningLanguage, DictionaryAdapter[]>;
