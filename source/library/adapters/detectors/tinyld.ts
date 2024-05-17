import { getTinyLDDetectionLanguageByLocale, isTinyLDLocale } from "logos:constants/languages";
import { DetectorAdapter, SingleDetectionResult } from "logos/adapters/detectors/adapter";
// REMINDER(vxern): Re-enable once works.
//import * as tinyld from "tinyld";
import { Client } from "logos/client";

class TinyLDAdapter extends DetectorAdapter {
	constructor(client: Client) {
		super(client, { identifier: "TinyLD" });
	}

	async detect({ text: _ }: { text: string }): Promise<SingleDetectionResult | undefined> {
		let detectedLocale: string;
		try {
			// detectedLocale = tinyld.toISO3(tinyld.detect(text));
			detectedLocale = "eng";
		} catch {
			return undefined;
		}

		if (!isTinyLDLocale(detectedLocale)) {
			return undefined;
		}

		const detectedLanguage = getTinyLDDetectionLanguageByLocale(detectedLocale);

		return { language: detectedLanguage };
	}
}

export { TinyLDAdapter };
