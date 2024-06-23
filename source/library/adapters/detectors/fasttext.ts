import { getFastTextDetectionLanguageByLocale, isFastTextLocale } from "logos:constants/languages";
import { getLanguageIdentificationModel } from "fasttext.wasm.js";
import { DetectorAdapter, type SingleDetectionResult } from "logos/adapters/detectors/adapter";
import type { Client } from "logos/client";

const model = await getLanguageIdentificationModel();
await model.load();

class FastTextAdapter extends DetectorAdapter {
	constructor(client: Client) {
		super(client, { identifier: "fasttext.wasm.js" });
	}

	async detect({ text }: { text: string }): Promise<SingleDetectionResult | undefined> {
		const result = await model.identify(text);
		if (!isFastTextLocale(result.alpha3)) {
			return undefined;
		}

		const detectedLanguage = getFastTextDetectionLanguageByLocale(result.alpha3);

		return { language: detectedLanguage, source: constants.licences.detectors.fasttext };
	}
}

export { FastTextAdapter };
