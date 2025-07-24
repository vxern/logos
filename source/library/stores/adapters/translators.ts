import type { Languages } from "rost:constants/languages";
import {
	type TranslationLanguage,
	type Translator,
	languageToLocale as languagesByIdentifier,
} from "rost:constants/languages/translation";
import { isDefined } from "rost:core/utilities";
import type { TranslatorAdapter } from "rost/adapters/translators/adapter";
import { DeepLAdapter } from "rost/adapters/translators/deepl";
import { GoogleTranslateAdapter } from "rost/adapters/translators/google-translate";
import { LingvanexAdapter } from "rost/adapters/translators/lingvanex";
import type { Client } from "rost/client";

class TranslatorStore {
	static readonly priority: Translator[] = ["deepl", "google", "lingvanex"];

	readonly adapters: {
		readonly deepl?: DeepLAdapter;
		readonly google?: GoogleTranslateAdapter;
		readonly lingvanex?: LingvanexAdapter;
	} & Partial<Record<Translator, TranslatorAdapter>>;

	constructor(client: Client) {
		const log = client.log.child({ name: "TranslatorStore" });

		const deeplAdapter = DeepLAdapter.tryCreate(client);
		if (deeplAdapter === undefined) {
			log.warn("`SECRET_DEEPL` has not been provided. Rost will run without a DeepL integration.");
		}

		const googleTranslateAdapter = GoogleTranslateAdapter.tryCreate(client);
		if (googleTranslateAdapter === undefined) {
			log.warn("`SECRET_RAPID_API` has not been provided. Rost will run without a Google Translate integration.");
		}

		const lingvanexAdapter = LingvanexAdapter.tryCreate(client);
		if (lingvanexAdapter === undefined) {
			log.warn("`SECRET_RAPID_API` has not been provided. Rost will run without a Lingvanex integration.");
		}

		this.adapters = {
			deepl: deeplAdapter,
			google: googleTranslateAdapter,
			lingvanex: lingvanexAdapter,
		};
	}

	static isTranslationPairSupported({
		identifier,
		languages,
	}: { identifier: Translator; languages: Languages<TranslationLanguage> }): boolean {
		const supportedLanguages = languagesByIdentifier[identifier];

		return languages.source in supportedLanguages && languages.target in supportedLanguages;
	}

	getTranslators({ languages }: { languages: Languages<TranslationLanguage> }): TranslatorAdapter[] {
		const viableTranslators = TranslatorStore.priority.filter((identifier) =>
			TranslatorStore.isTranslationPairSupported({ identifier, languages }),
		);

		return viableTranslators.map((identifier) => this.adapters[identifier]).filter(isDefined);
	}
}

export { TranslatorStore };
