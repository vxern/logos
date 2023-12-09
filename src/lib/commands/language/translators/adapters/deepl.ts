import constants from "../../../../../constants/constants";
import {
	DeepLLanguage,
	Languages,
	getDeepLLocaleByTranslationLanguage,
	getDeepLTranslationLanguageByLocale,
	isDeepLLocale,
} from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import defaults from "../../../../../defaults";
import { Client } from "../../../../client";
import { Translation, TranslationAdapter } from "../adapter";

class DeepLAdapter extends TranslationAdapter<DeepLLanguage> {
	constructor() {
		super({ identifier: "DeepL" });
	}

	async translate(client: Client, text: string, languages: Languages<DeepLLanguage>): Promise<Translation | undefined> {
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
					"User-Agent": defaults.USER_AGENT,
					"Content-Type": "application/json",
					Authorization: `DeepL-Auth-Key ${client.environment.deeplSecret}`,
				},
				body: JSON.stringify({
					text: [text],
					source_lang: sourceLocale,
					target_lang: targetLocale,
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

		let data;
		try {
			data = await response.json();
		} catch (exception) {
			client.log.error(`Reading response data for text translation to ${this.identifier} failed:`, exception);
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

		return { detectedSourceLanguage, text: translation.text, source: licences.translators.deepl };
	}
}

const adapter = new DeepLAdapter();

export default adapter;
