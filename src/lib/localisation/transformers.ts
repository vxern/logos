import { Language } from "../../types.js";
import armenian from "./transformers/armenian.js";
import english from "./transformers/english.js";
import french from "./transformers/french.js";
import hungarian from "./transformers/hungarian.js";
import polish from "./transformers/polish.js";
import romanian from "./transformers/romanian.js";

type TransformerType = "pluralise";
type Transformer = (matchTerm: string, matches: Record<string, string>) => string | undefined;

const transformers: Record<Language, Record<TransformerType, Transformer>> = {
	Armenian: armenian,
	English: english,
	French: french,
	Hungarian: hungarian,
	Polish: polish,
	Romanian: romanian,
};

export default transformers;
