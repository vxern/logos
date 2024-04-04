import { getTinyLDDetectionLanguageByLocale, isTinyLDLocale } from "logos:constants/languages";
import { SingleDetectionResult, DetectorAdapter } from "logos/adapters/detectors/adapter";
import * as tinyld from "tinyld";
import { Client } from "logos/client";

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

		const detectedLanguage = getTinyLDDetectionLanguageByLocale(detectedLocale);

		return { language: detectedLanguage };
	}
}

export { TinyLDAdapter };
