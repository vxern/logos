import { DetectionLanguage } from "logos:constants/languages";

interface Detection {
	language: DetectionLanguage;
}

// TODO(vxern): Deprecate this `identifier` property and create a logger instance instead.
abstract class LanguageDetectorAdapter {
	readonly identifier: string;

	constructor({ identifier }: { identifier: string }) {
		this.identifier = identifier;
	}

	abstract detect(text: string): Promise<Detection | undefined>;
}

export { LanguageDetectorAdapter };
export type { Detection };
