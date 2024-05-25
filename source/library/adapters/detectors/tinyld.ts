import { getTinyLDDetectionLanguageByLocale, isTinyLDLocale } from "logos:constants/languages";
import { DetectorAdapter, type SingleDetectionResult } from "logos/adapters/detectors/adapter";
// REMINDER(vxern): Re-enable the package once it's fixed on Bun. (Weird exception getting thrown on startup)
import type { Client } from "logos/client";

class TinyLDAdapter extends DetectorAdapter {
	constructor(client: Client) {
		super(client, { identifier: "TinyLD" });
	}

	detect({ text: _ }: { text: string }): SingleDetectionResult | undefined {
		// REMINDER(vxern): This will be removed once TinyLD works once again.
		return undefined;

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
