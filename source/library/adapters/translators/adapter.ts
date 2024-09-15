import type { Languages } from "logos:constants/languages";
import type { TranslationLanguage } from "logos:constants/languages/translation";
import type { Licence } from "logos:constants/licences";
import type { Client } from "logos/client";
import type pino from "pino";

interface TranslationResult {
	/** The language detected from the text sent to be translated. */
	readonly detectedSourceLanguage?: TranslationLanguage;

	/** The translation result. */
	readonly text: string;

	/** The source of the result. */
	readonly source: Licence;
}

abstract class TranslatorAdapter<Language extends string = TranslationLanguage> {
	readonly log: pino.Logger;
	readonly client: Client;

	constructor(client: Client, { identifier }: { identifier: string }) {
		this.log = client.log.child({ name: identifier });
		this.client = client;
	}

	abstract translate({
		text,
		languages,
	}: { text: string; languages: Languages<Language> }): Promise<TranslationResult | undefined>;
}

export { TranslatorAdapter };
export type { TranslationResult };
