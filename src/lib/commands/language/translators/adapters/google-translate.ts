import {
	GoogleTranslateLanguage,
	Languages,
	TranslationLocale,
	getGoogleTranslateLocaleByTranslationLanguage,
} from "../../../../../constants/languages";
import {
	getGoogleTranslateLanguageByLocale,
	isGoogleTranslateLocale,
} from "../../../../../constants/languages/translation";
import { Client } from "../../../../client";
import { Translation, TranslationAdapter } from "../adapter";

interface TranslationResult {
	data: {
		translations: {
			detectedSourceLanguage?: string;
			translatedText: string;
		}[];
	};
}

class GoogleTranslateAdapter extends TranslationAdapter<GoogleTranslateLanguage> {
	constructor() {
		super({ identifier: "GoogleTranslate" });
	}

	async translate(
		client: Client,
		text: string,
		languages: Languages<GoogleTranslateLanguage>,
	): Promise<Translation | undefined> {
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
					"X-RapidAPI-Key": client.environment.rapidApiSecret,
					"X-RapidAPI-Host": constants.endpoints.googleTranslate.host,
				},
				body: new URLSearchParams({
					source: locales.source,
					target: locales.target,
					q: text,
					format: "text",
				}),
			});
		} catch (exception) {
			client.log.error(
				`The request to translate text of length ${text.length} to ${this.identifier} failed:`,
				exception,
			);
			return undefined;
		}

		if (!response.ok) {
			return undefined;
		}

		let result: TranslationResult;
		try {
			result = (await response.json()) as TranslationResult;
		} catch (exception) {
			client.log.error(`Reading response data for text translation to ${this.identifier} failed:`, exception);
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

const adapter = new GoogleTranslateAdapter();

export default adapter;
