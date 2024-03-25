import { Languages, TranslationLanguage } from "logos:constants/languages";
import { Client } from "logos/client";

interface Translation {
	/** The language detected from the text sent to be translated. */
	detectedSourceLanguage?: TranslationLanguage;

	/** The translation result. */
	text: string;
}

// TODO(vxern): Deprecate this `identifier` property and create a logger instance instead.
abstract class TranslationAdapter<Language extends string = TranslationLanguage> {
	readonly identifier: string;

	constructor({ identifier }: { identifier: string }) {
		this.identifier = identifier;
	}

	abstract translate(client: Client, text: string, languages: Languages<Language>): Promise<Translation | undefined>;
}

export { TranslationAdapter };
export type { Translation };
