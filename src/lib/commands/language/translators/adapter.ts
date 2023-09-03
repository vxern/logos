import { TranslationLanguage } from "../../../../constants/languages";
import { Client } from "../../../client";

interface TranslationLanguages {
	source: TranslationLanguage;
	target: TranslationLanguage;
}

interface Translation {
	/** The language detected from the text sent to be translated. */
	detectedSourceLanguage?: string;

	/** The translation result. */
	text: string;
}

abstract class TranslationAdapter {
	readonly identifier: string;

	constructor({ identifier }: { identifier: string }) {
		this.identifier = identifier;
	}

	abstract translate(client: Client, text: string, languages: TranslationLanguages): Promise<Translation | undefined>;
}

export { TranslationAdapter };
export type { Translation, TranslationLanguages };
