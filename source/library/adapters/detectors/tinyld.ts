import { getTinyLDLanguageByLocale, isTinyLDLocale } from "logos:constants/languages/detection";
import { DetectorAdapter, type SingleDetectionResult } from "logos/adapters/detectors/adapter";
import type { Client } from "logos/client";
import * as tinyld from "tinyld/heavy";

class TinyLDAdapter extends DetectorAdapter {
	constructor(client: Client) {
		super(client, { identifier: "TinyLD" });
	}

	async detect({ text }: { text: string }): Promise<SingleDetectionResult | undefined> {
		let detectedLocale: string;
		try {
			detectedLocale = tinyld.toISO3(tinyld.detect(text));
		} catch {
			return undefined;
		}

		if (!isTinyLDLocale(detectedLocale)) {
			return undefined;
		}

		const detectedLanguage = getTinyLDLanguageByLocale(detectedLocale);

		return { language: detectedLanguage, source: constants.licences.detectors.tinyld };
	}
}

export { TinyLDAdapter };
