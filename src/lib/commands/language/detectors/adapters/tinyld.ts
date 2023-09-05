import { getTinyLDDetectionLanguageByLocale, isTinyLDLocale } from "../../../../../constants/languages";
import { Detection, LanguageDetectorAdapter } from "../adapter";
import * as tinyld from "tinyld";

class TinyLDAdapter extends LanguageDetectorAdapter {
	constructor() {
		super({ identifier: "TinyLD" });
	}

	async detect(text: string): Promise<Detection | undefined> {
		const result = tinyld.detect(text);

		const detectedLocale = tinyld.toISO3(result);
		const detectedLanguage =
			detectedLocale === undefined || !isTinyLDLocale(detectedLocale)
				? undefined
				: getTinyLDDetectionLanguageByLocale(detectedLocale);
		if (detectedLanguage === undefined) {
			return undefined;
		}

		return { language: detectedLanguage };
	}
}

const adapter = new TinyLDAdapter();

export default adapter;
