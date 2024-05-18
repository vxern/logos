import type { Languages, TranslationLanguage, Translator } from "logos:constants/languages";
import { languageToLocale as languagesByIdentifier } from "logos:constants/languages/translation";
import { isDefined } from "logos:core/utilities";
import type { TranslatorAdapter } from "logos/adapters/translators/adapter";
import { DeepLAdapter } from "logos/adapters/translators/deepl";
import { GoogleTranslateAdapter } from "logos/adapters/translators/google-translate";
import type { Client } from "logos/client";
import { Logger } from "logos/logger";

class TranslatorStore {
	static readonly priority: Translator[] = ["deepl", "google"];

	readonly adapters: {
		readonly deepl?: DeepLAdapter;
		readonly google?: GoogleTranslateAdapter;
	} & Partial<Record<Translator, TranslatorAdapter>>;

	constructor(client: Client) {
		const log = Logger.create({ identifier: "TranslatorStore", isDebug: client.environment.isDebug });

		const deeplAdapter = DeepLAdapter.tryCreate(client);
		if (deeplAdapter === undefined) {
			log.warn("`SECRET_DEEPL` was not provided. Logos will run without a DeepL integration.");
		}

		const googleTranslateAdapter = GoogleTranslateAdapter.tryCreate(client);
		if (googleTranslateAdapter === undefined) {
			log.warn("`SECRET_RAPID_API` was not provided. Logos will run without a Google Translate integration.");
		}

		this.adapters = {
			deepl: deeplAdapter,
			google: googleTranslateAdapter,
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
