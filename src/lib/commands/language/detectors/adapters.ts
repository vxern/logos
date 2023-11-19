import { LanguageDetectorAdapter } from "./adapter";
import cld from "./adapters/cld";
import tinyld from "./adapters/tinyld";

// Arranged in order of priority; accuracy.
const adapters: LanguageDetectorAdapter[] = [tinyld, cld];

function getAdapters(): LanguageDetectorAdapter[] {
	return adapters;
}

export { getAdapters };
