import {
	type Languages,
	type LingvanexLanguage,
	type TranslationLocale,
	getLingvanexLocaleByTranslationLanguage,
	getLingvanexTranslationLanguageByLocale,
	isLingvanexLocale,
} from "logos:constants/languages";
import { type TranslationResult, TranslatorAdapter } from "logos/adapters/translators/adapter";
import type { Client } from "logos/client";

interface LingvanexResult {
	readonly err: unknown;
	readonly result?: string;
	readonly cacheUse: number;
	readonly source: string;
	readonly from?: string;
	readonly sourceTransliteration: string;
	readonly targetTransliteration: string;
}

class LingvanexAdapter extends TranslatorAdapter<LingvanexLanguage> {
	readonly token: string;

	constructor(client: Client, { token }: { token: string }) {
		super(client, { identifier: "Lingvanex" });

		this.token = token;
	}

	static tryCreate(client: Client): LingvanexAdapter | undefined {
		if (client.environment.rapidApiSecret === undefined) {
			return undefined;
		}

		return new LingvanexAdapter(client, { token: client.environment.rapidApiSecret });
	}

	async translate({
		text,
		languages,
	}: { text: string; languages: Languages<LingvanexLanguage> }): Promise<TranslationResult | undefined> {
		const sourceLocale = getLingvanexLocaleByTranslationLanguage(languages.source);
		const targetLocale = getLingvanexLocaleByTranslationLanguage(languages.target);

		const locales: Languages<TranslationLocale> = { source: sourceLocale, target: targetLocale };

		const response = await fetch(constants.endpoints.lingvanex.translate, {
			method: "POST",
			headers: {
				"User-Agent": constants.USER_AGENT,
				"Content-Type": "application/x-www-form-urlencoded",
				"X-RapidAPI-Key": this.token,
				"X-RapidAPI-Host": constants.endpoints.lingvanex.host,
			},
			body: new URLSearchParams({
				platform: "api",
				from: locales.source,
				to: locales.target,
				data: text,
			}),
		});
		if (!response.ok) {
			return undefined;
		}

		const { result: translatedText, from: detectedSourceLocale } = (await response.json()) as LingvanexResult;
		if (translatedText === undefined) {
			return undefined;
		}

		const detectedSourceLanguage =
			detectedSourceLocale === undefined || !isLingvanexLocale(detectedSourceLocale)
				? undefined
				: getLingvanexTranslationLanguageByLocale(detectedSourceLocale);

		return { detectedSourceLanguage, text: translatedText };
	}
}

export { LingvanexAdapter };
