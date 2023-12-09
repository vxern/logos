import constants from "../../../../../constants/constants";
import {
	Languages,
	LingvanexLanguage,
	TranslationLocale,
	getLingvanexLocaleByTranslationLanguage,
	getLingvanexTranslationLanguageByLocale,
	isLingvanexLocale,
} from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import defaults from "../../../../../defaults";
import { Client } from "../../../../client";
import { Translation, TranslationAdapter } from "../adapter";

interface TranslationResult {
	// err: unknown;
	result?: string;
	// cacheUse: number;
	// source: string;
	from?: string;
	// sourceTransliteration: string;
	// targetTransliteration: string;
}

class LingvanexAdapter extends TranslationAdapter<LingvanexLanguage> {
	constructor() {
		super({ identifier: "Lingvanex" });
	}

	async translate(
		client: Client,
		text: string,
		languages: Languages<LingvanexLanguage>,
	): Promise<Translation | undefined> {
		const sourceLocale = getLingvanexLocaleByTranslationLanguage(languages.source);
		const targetLocale = getLingvanexLocaleByTranslationLanguage(languages.target);

		const locales: Languages<TranslationLocale> = { source: sourceLocale, target: targetLocale };

		let response: Response;
		try {
			response = await fetch(constants.endpoints.lingvanex.translate, {
				method: "POST",
				headers: {
					"User-Agent": defaults.USER_AGENT,
					"Content-Type": "application/x-www-form-urlencoded",
					"X-RapidAPI-Key": client.environment.rapidApiSecret,
					"X-RapidAPI-Host": constants.endpoints.lingvanex.host,
				},
				body: new URLSearchParams({
					platform: "api",
					from: locales.source,
					to: locales.target,
					data: text,
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
			result = await response.json();
		} catch (exception) {
			client.log.error(`Reading response data for text translation to ${this.identifier} failed:`, exception);
			return undefined;
		}

		const { result: translatedText, from: detectedSourceLocale } = result;
		if (translatedText === undefined) {
			return undefined;
		}

		const detectedSourceLanguage =
			detectedSourceLocale === undefined || !isLingvanexLocale(detectedSourceLocale)
				? undefined
				: getLingvanexTranslationLanguageByLocale(detectedSourceLocale);

		return { detectedSourceLanguage, text: translatedText, source: licences.translators.lingvanex };
	}
}

const adapter = new LingvanexAdapter();

export default adapter;
