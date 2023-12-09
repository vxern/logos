import { Languages, TranslationLanguage } from "../../../../constants/languages";
import { Client } from "../../../client";

interface Translation {
	/** The language detected from the text sent to be translated. */
	detectedSourceLanguage?: TranslationLanguage;

	/** The translation result. */
	text: string;

	source: {
		name: string;
		link: string;
	};
}

abstract class TranslationAdapter<Language extends string = TranslationLanguage> {
	readonly identifier: string;

	constructor({ identifier }: { identifier: string }) {
		this.identifier = identifier;
	}

	abstract translate(client: Client, text: string, languages: Languages<Language>): Promise<Translation | undefined>;
}

export { TranslationAdapter };
export type { Translation };
