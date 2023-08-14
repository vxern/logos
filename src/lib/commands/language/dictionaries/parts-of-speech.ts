import { LearningLanguage } from "../../../../constants/languages";
import { PartOfSpeech } from "./part-of-speech";
import english from "./parts-of-speech/english";
import romanian from "./parts-of-speech/romanian";

export default {
	"Armenian/Western": {},
	"Armenian/Eastern": {},
	Dutch: {},
	"English/American": english,
	"English/British": english,
	Finnish: {},
	French: {},
	German: {},
	Greek: {},
	Hungarian: {},
	"Norwegian/Bokmål": {},
	Polish: {},
	Romanian: romanian,
	Turkish: {},
} satisfies Record<LearningLanguage, Record<string, PartOfSpeech>>;
