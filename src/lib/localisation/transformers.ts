import { Language } from "../../types.js";
import english from "./transformers/english.js";
import french from "./transformers/french.js";
import hungarian from "./transformers/hungarian.js";
import polish from "./transformers/polish.js";
import romanian from "./transformers/romanian.js";
import * as MessagePipe from "messagepipe";

const transformers: Record<Language, Record<string, MessagePipe.MessagePipeTransformer<string, string>>> = {
	Armenian: {},
	English: english,
	French: french,
	Hungarian: hungarian,
	Polish: polish,
	Romanian: romanian,
};

export default transformers;
