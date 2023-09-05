import { getCLDDetectionLanguageByLocale, isCLDLocale } from "../../../../../constants/languages";
import { Detection, LanguageDetectorAdapter } from "../adapter";
import cld from "cldpre";

class CLDAdapter extends LanguageDetectorAdapter {
	constructor() {
		super({ identifier: "CLD" });
	}

	async detect(text: string): Promise<Detection | undefined> {
		let result: cld.DetectLanguage;
		try {
			result = await cld.detect(text);
		} catch {
			return undefined;
		}

		const detection = result.languages.at(0);
		if (detection === undefined) {
			return undefined;
		}

		const detectedLocale = detection.code;
		const detectedLanguage = isCLDLocale(detectedLocale) ? getCLDDetectionLanguageByLocale(detectedLocale) : undefined;
		if (detectedLanguage === undefined) {
			return undefined;
		}

		return { language: detectedLanguage };
	}
}

const adapter = new CLDAdapter();

export default adapter;
