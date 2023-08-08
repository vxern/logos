import { LocalisationLanguage } from "../../constants/languages";
import armenian from "./transformers/armenian";
import dutch from "./transformers/dutch";
import english from "./transformers/english";
import finnish from "./transformers/finnish";
import french from "./transformers/french";
import greek from "./transformers/greek";
import hungarian from "./transformers/hungarian";
import norwegian from "./transformers/norwegian";
import polish from "./transformers/polish";
import romanian from "./transformers/romanian";
import turkish from "./transformers/turkish";

type TransformerType = "pluralise";
type Transformer = (matchTerm: string, matches: Record<string, string>) => string | undefined;

const transformers: Record<LocalisationLanguage, Record<TransformerType, Transformer>> = {
	"English/American": english,
	"English/British": english,
	French: french,
	Hungarian: hungarian,
	"Norwegian/Bokmål": norwegian,
	Polish: polish,
	Romanian: romanian,
	Turkish: turkish,
	Dutch: dutch,
	Greek: greek,
	Finnish: finnish,
	"Armenian/Western": armenian,
	"Armenian/Eastern": armenian,
};

export default transformers;
