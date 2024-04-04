import { Languages, TranslationLanguage } from "logos:constants/languages";
import { Logger } from "logos/logger";
import { Client } from "logos/client";

interface TranslationResult {
	/** The language detected from the text sent to be translated. */
	readonly detectedSourceLanguage?: TranslationLanguage;

	/** The translation result. */
	readonly text: string;
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
