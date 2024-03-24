import { DetectionLanguage } from "logos:constants/languages";

interface Detection {
	language: DetectionLanguage;
}

abstract class LanguageDetectorAdapter {
	readonly identifier: string;

	constructor({ identifier }: { identifier: string }) {
		this.identifier = identifier;
	}

	abstract detect(text: string): Promise<Detection | undefined>;
}

export { LanguageDetectorAdapter };
export type { Detection };
