import type { DetectionLanguage, Detector } from "logos:constants/languages";
import type { Licence } from "logos:constants/licences.ts";
import type { DetectorAdapter, SingleDetectionResult } from "logos/adapters/detectors/adapter";
import { CLDAdapter } from "logos/adapters/detectors/cld";
import { ELDAdapter } from "logos/adapters/detectors/eld";
import { FastTextAdapter } from "logos/adapters/detectors/fasttext";
import { TinyLDAdapter } from "logos/adapters/detectors/tinyld";
import type { Client } from "logos/client";

interface DetectionResult {
	readonly likely: DetectionLanguage[];
	readonly possible: DetectionLanguage[];
	readonly sources: Licence[];
}

class DetectorStore {
	readonly adapters: {
		readonly cld: CLDAdapter;
		readonly tinyld: TinyLDAdapter;
		readonly fasttext: FastTextAdapter;
		readonly eld: ELDAdapter;
	} & Record<Detector, DetectorAdapter>;

	constructor(client: Client) {
		this.adapters = {
			cld: new CLDAdapter(client),
			tinyld: new TinyLDAdapter(client),
			fasttext: new FastTextAdapter(client),
			eld: new ELDAdapter(client),
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
		const sortedByFrequency = detections.reduce<Partial<Record<DetectionLanguage, Licence[]>>>(
			(sorted, detection) => {
				if (detection.language in sorted) {
					sorted[detection.language]!.push(detection.source);
				} else {
					sorted[detection.language] = [detection.source];
				}

				return sorted;
			},
			{},
		);

		const mode = Math.max(...Object.values(sortedByFrequency).map((sources) => sources.length));

		const result: DetectionResult = { likely: [], possible: [], sources: [] };
		for (const [language, sources] of Object.entries(sortedByFrequency) as [DetectionLanguage, Licence[]][]) {
			if (sources.length === mode) {
				result.likely.push(language);
			} else {
				result.possible.push(language);
			}

			result.sources.push(...sources);
		}

		return result;
	}
}

export { DetectorStore };
