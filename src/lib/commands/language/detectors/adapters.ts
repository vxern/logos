import { LanguageDetectorAdapter } from "./adapter";
import tinyld from "./adapters/tinyld";

// Arranged in order of priority; accuracy.
const adapters: LanguageDetectorAdapter[] = [tinyld];

function getAdapters(): LanguageDetectorAdapter[] {
	return adapters;
}

export { getAdapters };
