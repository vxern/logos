import type { DetectionLanguage, Detector } from "logos:constants/languages";
import type { DetectorAdapter, SingleDetectionResult } from "logos/adapters/detectors/adapter";
import { CLDAdapter } from "logos/adapters/detectors/cld";
import { TinyLDAdapter } from "logos/adapters/detectors/tinyld";
import type { Client } from "logos/client";

interface DetectionResult {
	readonly likely: DetectionLanguage[];
	readonly possible: DetectionLanguage[];
}

type DetectionFrequencies = Partial<Record<DetectionLanguage, number>>;
class DetectorStore {
	readonly adapters: {
		readonly cld: CLDAdapter;
		readonly tinyld: TinyLDAdapter;
	} & Record<Detector, DetectorAdapter>;

	constructor(client: Client) {
		this.adapters = {
			cld: new CLDAdapter(client),
			tinyld: new TinyLDAdapter(client),
		};
	}

	async runDetectors({ text }: { text: string }): Promise<SingleDetectionResult[]> {
		const adapters = Object.values(this.adapters);

		const detections: SingleDetectionResult[] = [];
		for await (const element of Promise.createRace(adapters, (adapter) => adapter.detect({ text }))) {
			if (element.result === undefined) {
				continue;
			}

			detections.push(element.result);
		}

		return detections;
	}

	async detectLanguages({ text }: { text: string }): Promise<DetectionResult> {
		const detections = await this.runDetectors({ text });

		return this.compileDetections({ detections });
	}

	compileDetections({ detections }: { detections: SingleDetectionResult[] }): DetectionResult {
		const sortedByFrequency = detections.reduce<DetectionFrequencies>((sorted, detection) => {
			if (detection.language in sorted) {
				sorted[detection.language]! += 1;
			} else {
				sorted[detection.language] = 1;
			}

			return sorted;
		}, {});

		const mode = Math.max(...Object.values(sortedByFrequency));

		const result: DetectionResult = { likely: [], possible: [] };
		for (const [language, frequency] of Object.entries(sortedByFrequency) as [DetectionLanguage, number][]) {
			if (frequency === mode) {
				result.likely.push(language);
			} else {
				result.possible.push(language);
			}
		}

		return result;
	}
}

export { DetectorStore };
