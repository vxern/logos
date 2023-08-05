import { LocalisationLanguage } from "../../constants/language";
import armenian from "./transformers/armenian";
import english from "./transformers/english";
import french from "./transformers/french";
import hungarian from "./transformers/hungarian";
import norwegian from "./transformers/norwegian";
import polish from "./transformers/polish";
import romanian from "./transformers/romanian";
import turkish from "./transformers/turkish";

type TransformerType = "pluralise";
type Transformer = (matchTerm: string, matches: Record<string, string>) => string | undefined;

const transformers: Record<LocalisationLanguage, Record<TransformerType, Transformer>> = {
	// Built-in
	...{
		English: english,
		French: french,
		Hungarian: hungarian,
		Norwegian: norwegian,
		Polish: polish,
		Romanian: romanian,
		Turkish: turkish,
	},
	// Custom
	...{
		"Armenian/Eastern": armenian,
		"Armenian/Western": armenian,
	},
};

export default transformers;
