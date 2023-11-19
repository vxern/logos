import { LearningLanguage } from "../../../../constants/languages";
import { PartOfSpeech } from "./part-of-speech";
import english from "./parts-of-speech/english";
import french from "./parts-of-speech/french";
import romanian from "./parts-of-speech/romanian";

export default {
	"Armenian/Western": {},
	"Armenian/Eastern": {},
	Danish: {},
	Dutch: {},
	"English/American": english,
	"English/British": english,
	Finnish: {},
	French: french,
	German: {},
	Greek: {},
	Hungarian: {},
	"Norwegian/Bokmål": {},
	Polish: {},
	Romanian: romanian,
	Russian: {},
	Silesian: {},
	Swedish: {},
	Turkish: {},
} satisfies Record<LearningLanguage, Record<string, PartOfSpeech>>;
