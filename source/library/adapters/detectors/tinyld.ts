import { getTinyLDLanguageByLocale, isTinyLDLocale } from "logos:constants/languages/detection.ts";
import { DetectorAdapter, type SingleDetectionResult } from "logos/adapters/detectors/adapter";
// REMINDER(vxern): Re-enable the package once it's fixed on Bun. (Weird exception getting thrown on startup)
import type { Client } from "logos/client";

class TinyLDAdapter extends DetectorAdapter {
	constructor(client: Client) {
		super(client, { identifier: "TinyLD" });
	}

	detect({ text: _ }: { text: string }): SingleDetectionResult | undefined {
		let detectedLocale: string;
		try {
			// detectedLocale = tinyld.toISO3(tinyld.detect(text));
			// REMINDER(vxern): This will be removed once TinyLD works once again.
			detectedLocale = "this value will not match and the adapter will therefore return nothing";
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
