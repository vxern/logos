import { getELDDetectionLanguageByLocale, isELDLocale } from "logos:constants/languages";
// @ts-expect-error: ELD is ES2015.
import { eld } from "eld";
import { DetectorAdapter, type SingleDetectionResult } from "logos/adapters/detectors/adapter";
import type { Client } from "logos/client";

class ELDAdapter extends DetectorAdapter {
	constructor(client: Client) {
		super(client, { identifier: "eld" });
	}

	async detect({ text }: { text: string }): Promise<SingleDetectionResult | undefined> {
		const result = await eld.detect(text);
		if (!isELDLocale(result.language)) {
			return undefined;
		}

		const detectedLanguage = getELDDetectionLanguageByLocale(result.language);

		return { language: detectedLanguage, source: constants.licences.detectors.eld };
	}
}

export { ELDAdapter };
