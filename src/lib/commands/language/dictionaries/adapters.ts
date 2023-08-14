import { LearningLanguage } from "../../../../constants/languages";
import { DictionaryAdapter } from "./adapter";
import dexonline from "./adapters/dexonline";
import wiktionary from "./adapters/wiktionary";
import wordsApi from "./adapters/words-api";

export default {
	Dutch: [wiktionary],
	"English/American": [wiktionary, wordsApi],
	"English/British": [wiktionary, wordsApi],
	Finnish: [wiktionary],
	French: [wiktionary],
	German: [wiktionary],
	Greek: [wiktionary],
	Hungarian: [wiktionary],
	"Norwegian/Bokmål": [wiktionary],
	Polish: [wiktionary],
	Romanian: [dexonline, wiktionary],
	Turkish: [wiktionary],
	"Armenian/Western": [wiktionary],
	"Armenian/Eastern": [wiktionary],
} satisfies Record<LearningLanguage, DictionaryAdapter[]> as Record<LearningLanguage, DictionaryAdapter[]>;
