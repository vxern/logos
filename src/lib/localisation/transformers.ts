import { LocalisationLanguage } from "../../constants/languages";
import { Transformer, TransformerType } from "./transformer";
import armenian from "./transformers/armenian";
import dutch from "./transformers/dutch";
import english from "./transformers/english";
import finnish from "./transformers/finnish";
import french from "./transformers/french";
import german from "./transformers/german";
import greek from "./transformers/greek";
import hungarian from "./transformers/hungarian";
import norwegian from "./transformers/norwegian";
import polish from "./transformers/polish";
import romanian from "./transformers/romanian";
import swedish from "./transformers/swedish";
import turkish from "./transformers/turkish";

export default {
	"Armenian/Western": armenian,
	"Armenian/Eastern": armenian,
	Dutch: dutch,
	"English/American": english,
	"English/British": english,
	Finnish: finnish,
	French: french,
	German: german,
	Greek: greek,
	Hungarian: hungarian,
	"Norwegian/Bokmål": norwegian,
	Polish: polish,
	Romanian: romanian,
	Swedish: swedish,
	Turkish: turkish,
} as const satisfies Record<LocalisationLanguage, Record<TransformerType, Transformer>>;
