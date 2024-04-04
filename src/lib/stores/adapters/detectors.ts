import { SingleDetectionResult } from "logos/adapters/detectors/adapter";
import { TinyLDAdapter } from "logos/adapters/detectors/tinyld";
import { Client } from "logos/client";
import { DetectionLanguage } from "logos:constants/languages";

interface DetectionResult {
	readonly likely: DetectionLanguage[];
	readonly possible: DetectionLanguage[];
}

type DetectionFrequencies = Partial<Record<DetectionLanguage, number>>;
class DetectorStore {
	readonly adapters: {
		readonly tinyld: TinyLDAdapter;
	};

	constructor(client: Client) {
		this.adapters = {
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
