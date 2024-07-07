import { getCLDLanguageByLocale, isCLDLocale } from "logos:constants/languages/detection.ts";
import cld from "cldpre";
import { DetectorAdapter, type SingleDetectionResult } from "logos/adapters/detectors/adapter";
import type { Client } from "logos/client";

class CLDAdapter extends DetectorAdapter {
	constructor(client: Client) {
		super(client, { identifier: "CLD" });
	}

	async detect({ text }: { text: string }): Promise<SingleDetectionResult | undefined> {
		const result = await cld.detect(text).catch(() => undefined);
		const detectedLocale = result?.languages.at(0)?.code;
		if (detectedLocale === undefined || !isCLDLocale(detectedLocale)) {
			return undefined;
		}

		const detectedLanguage = getCLDLanguageByLocale(detectedLocale);

		return { language: detectedLanguage, source: constants.licences.detectors.cld };
	}
}

export { CLDAdapter };
