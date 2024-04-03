import { LanguageDetectorAdapter } from "logos/commands/detectors/adapter";
import cld from "./detectors/cld";
import { DetectionLanguage } from "logos:constants/languages";

// Arranged in order of priority; accuracy.
const adapters: LanguageDetectorAdapter[] = [cld];

function getAdapters(): LanguageDetectorAdapter[] {
	return adapters;
}

async function detectLanguages({ text }: { text: string }): Promise<DetectedLanguagesSorted> {
	const adapters = getAdapters();

	const detectionFrequencies: Partial<Record<DetectionLanguage, number>> = {};
	for await (const element of Promise.createRace(adapters, (adapter) => adapter.detect(text))) {
		if (element.result === undefined) {
			continue;
		}

		const detection = element.result;
		const detectedLanguage = detection.language;

		detectionFrequencies[detectedLanguage] = (detectionFrequencies[detectedLanguage] ?? 1) + 1;
	}

	return getLanguagesSorted(detectionFrequencies);
}

type DetectedLanguagesSorted = {
	likely: DetectionLanguage[];
	possible: DetectionLanguage[];
};
function getLanguagesSorted(detectionFrequencies: Partial<Record<DetectionLanguage, number>>): DetectedLanguagesSorted {
	const entries = Object.entries(detectionFrequencies) as [DetectionLanguage, number][];

	let mode = 0;
	for (const [_, frequency] of entries) {
		if (frequency > mode) {
			mode = frequency;
		}
	}

	const likely = entries.filter(([_, frequency]) => frequency === mode).map(([language, _]) => language);
	const possible = entries.map(([language, _]) => language).filter((language) => !likely.includes(language));

	return { likely, possible };
}

export { getAdapters, detectLanguages };
