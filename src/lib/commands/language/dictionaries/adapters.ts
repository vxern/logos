import { DictionaryAdapter } from "./adapter";
import dexonline from "./adapters/dexonline";
import wiktionary from "./adapters/wiktionary";

const adapters: DictionaryAdapter[] = [dexonline, wiktionary];

export default adapters;
