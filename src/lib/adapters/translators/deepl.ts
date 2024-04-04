import {
	DeepLLanguage,
	Languages,
	getDeepLLocaleByTranslationLanguage,
	getDeepLTranslationLanguageByLocale,
	isDeepLLocale,
} from "logos:constants/languages";
import { Client } from "logos/client";
import { TranslationResult, TranslatorAdapter } from "logos/adapters/translators/adapter";

class DeepLAdapter extends TranslatorAdapter<DeepLLanguage> {
	constructor(client: Client) {
		super(client, { identifier: "DeepL" });
	}

	async translate({
		text,
		languages,
	}: { text: string; languages: Languages<DeepLLanguage> }): Promise<TranslationResult | undefined> {
		const sourceLocaleComplete = getDeepLLocaleByTranslationLanguage(languages.source);
		const targetLocale = getDeepLLocaleByTranslationLanguage(languages.target);

		const [sourceLocale, _] = sourceLocaleComplete.split("-");
		if (sourceLocale === undefined) {
			throw "StateError: Locale part unexpectedly undefined.";
		}

		let response: Response;
		try {
			response = await fetch(constants.endpoints.deepl.translate, {
				method: "POST",
				headers: {
					"User-Agent": constants.USER_AGENT,
					"Content-Type": "application/json",
					Authorization: `DeepL-Auth-Key ${this.client.environment.deeplSecret}`,
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

		const detectedSourceLanguage =
			detectedSourceLocale === undefined || !isDeepLLocale(detectedSourceLocale)
				? undefined
				: getDeepLTranslationLanguageByLocale(detectedSourceLocale);

		return { detectedSourceLanguage, text: translation.text };
	}
}

export { DeepLAdapter };
