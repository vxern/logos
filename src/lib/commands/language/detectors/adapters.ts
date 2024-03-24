import { LanguageDetectorAdapter } from "logos/commands/language/detectors/adapter";

// Arranged in order of priority; accuracy.
const adapters: LanguageDetectorAdapter[] = [];

function getAdapters(): LanguageDetectorAdapter[] {
	return adapters;
}

export { getAdapters };
