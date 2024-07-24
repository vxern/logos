import type { Languages } from "logos:constants/languages";
import type { TranslationLanguage } from "logos:constants/languages/translation.ts";
import type { Licence } from "logos:constants/licences.ts";
import type { Client } from "logos/client";
import { Logger } from "logos/logger";

interface TranslationResult {
	/** The language detected from the text sent to be translated. */
	readonly detectedSourceLanguage?: TranslationLanguage;

	/** The translation result. */
	readonly text: string;

	/** The source of the result. */
	readonly source: Licence;
}

abstract class TranslatorAdapter<Language extends string = TranslationLanguage> {
	readonly log: Logger;
	readonly client: Client;

	constructor(client: Client, { identifier }: { identifier: string }) {
		this.log = Logger.create({ identifier, isDebug: client.environment.isDebug });
		this.client = client;
	}

	abstract translate({
		text,
		languages,
	}: { text: string; languages: Languages<Language> }): Promise<TranslationResult | undefined>;
}

export { TranslatorAdapter };
export type { TranslationResult };
