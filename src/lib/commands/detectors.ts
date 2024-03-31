import { LanguageDetectorAdapter } from "logos/commands/detectors/adapter";
import cld from "./detectors/cld";

// Arranged in order of priority; accuracy.
const adapters: LanguageDetectorAdapter[] = [cld];

function getAdapters(): LanguageDetectorAdapter[] {
	return adapters;
}

export { getAdapters };
