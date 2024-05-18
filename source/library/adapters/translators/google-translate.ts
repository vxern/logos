import {
	type GoogleTranslateLanguage,
	type Languages,
	type TranslationLocale,
	getGoogleTranslateLocaleByTranslationLanguage,
} from "logos:constants/languages";
import { getGoogleTranslateLanguageByLocale, isGoogleTranslateLocale } from "logos:constants/languages/translation";
import { type TranslationResult, TranslatorAdapter } from "logos/adapters/translators/adapter";
import type { Client } from "logos/client";

interface GoogleTranslateResult {
	readonly data: {
		readonly translations: {
			readonly detectedSourceLanguage?: string;
			readonly translatedText: string;
		}[];
	};
}

class GoogleTranslateAdapter extends TranslatorAdapter<GoogleTranslateLanguage> {
	readonly token: string;

	constructor(client: Client, { token }: { token: string }) {
		super(client, { identifier: "GoogleTranslate" });

		this.token = token;
	}

	static tryCreate(client: Client): GoogleTranslateAdapter | undefined {
		if (client.environment.rapidApiSecret === undefined) {
			return undefined;
		}

		return new GoogleTranslateAdapter(client, { token: client.environment.rapidApiSecret });
	}

	async translate({
		text,
		languages,
	}: { text: string; languages: Languages<GoogleTranslateLanguage> }): Promise<TranslationResult | undefined> {
		if (this.client.environment.rapidApiSecret === undefined) {
			return undefined;
		}

		const sourceLocale = getGoogleTranslateLocaleByTranslationLanguage(languages.source);
		const targetLocale = getGoogleTranslateLocaleByTranslationLanguage(languages.target);

		const locales: Languages<TranslationLocale> = { source: sourceLocale, target: targetLocale };

		let response: Response;
		try {
			response = await fetch(constants.endpoints.googleTranslate.translate, {
				method: "POST",
				headers: {
					"User-Agent": constants.USER_AGENT,
					"Content-Type": "application/x-www-form-urlencoded",
					"X-RapidAPI-Key": this.token,
					"X-RapidAPI-Host": constants.endpoints.googleTranslate.host,
				},
				body: new URLSearchParams({ source: locales.source, target: locales.target, q: text, format: "text" }),
			});
		} catch (exception) {
			this.client.log.error(`The request to translate text of length ${text.length} failed:`, exception);
			return undefined;
		}

		if (!response.ok) {
			return undefined;
		}

		let result: GoogleTranslateResult;
		try {
			result = (await response.json()) as GoogleTranslateResult;
		} catch (exception) {
			this.client.log.error("Reading response data for text translation failed:", exception);
			return undefined;
		}

		const translation = result.data.translations?.at(0);
		if (translation === undefined) {
			return undefined;
		}

		const { detectedSourceLanguage: detectedSourceLocale, translatedText } = translation;
		if (translatedText === undefined) {
			return undefined;
		}

		const detectedSourceLanguage =
			detectedSourceLocale === undefined || !isGoogleTranslateLocale(detectedSourceLocale)
				? undefined
				: getGoogleTranslateLanguageByLocale(detectedSourceLocale);

		return { detectedSourceLanguage, text: translatedText };
	}
}

export { GoogleTranslateAdapter };
