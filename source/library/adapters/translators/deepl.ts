import {
	type DeepLLanguage,
	type Languages,
	getDeepLLocaleByTranslationLanguage,
	getDeepLTranslationLanguageByLocale,
	isDeepLLocale,
} from "logos:constants/languages";
import { type TranslationResult, TranslatorAdapter } from "logos/adapters/translators/adapter";
import type { Client } from "logos/client";

class DeepLAdapter extends TranslatorAdapter<DeepLLanguage> {
	readonly token: string;

	constructor(client: Client, { token }: { token: string }) {
		super(client, { identifier: "DeepL" });

		this.token = token;
	}

	static tryCreate(client: Client): DeepLAdapter | undefined {
		if (client.environment.deeplSecret === undefined) {
			return undefined;
		}

		return new DeepLAdapter(client, { token: client.environment.deeplSecret });
	}

	async translate({
		text,
		languages,
	}: { text: string; languages: Languages<DeepLLanguage> }): Promise<TranslationResult | undefined> {
		if (this.client.environment.deeplSecret === undefined) {
			return undefined;
		}

		const sourceLocaleComplete = getDeepLLocaleByTranslationLanguage(languages.source);
		const targetLocale = getDeepLLocaleByTranslationLanguage(languages.target);

		const [sourceLocale, _] = sourceLocaleComplete.split("-");
		if (sourceLocale === undefined) {
			throw new Error("Locale part unexpectedly undefined.");
		}

		let response: Response;
		try {
			response = await fetch(constants.endpoints.deepl.translate, {
				method: "POST",
				headers: {
					"User-Agent": constants.USER_AGENT,
					"Content-Type": "application/json",
					Authorization: `DeepL-Auth-Key ${this.token}`,
				},
				body: JSON.stringify({
					text: [text],
					source_lang: sourceLocale,
					target_lang: targetLocale,
				}),
			});
		} catch (exception) {
			this.log.error(`The request to translate text of length ${text.length} failed:`, exception);
			return undefined;
		}

		if (!response.ok) {
			return undefined;
		}

		let data: any;
		try {
			data = await response.json();
		} catch (exception) {
			this.log.error("Reading response data for text translation failed:", exception);
			return undefined;
		}

		const translation = data.translations.at(0);
		if (translation === undefined) {
			return undefined;
		}

		const detectedSourceLocale = translation.detected_source_language as string;
		if (detectedSourceLocale === undefined) {
			return undefined;
		}

		const detectedSourceLanguage = isDeepLLocale(detectedSourceLocale)
			? getDeepLTranslationLanguageByLocale(detectedSourceLocale)
			: undefined;

		return { detectedSourceLanguage, text: translation.text };
	}
}

export { DeepLAdapter };
