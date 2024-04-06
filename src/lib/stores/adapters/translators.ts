import { Languages, TranslationLanguage, Translator } from "logos:constants/languages";
import { languageToLocale as languagesByIdentifier } from "logos:constants/languages/translation";
import { TranslatorAdapter } from "logos/adapters/translators/adapter";
import { DeepLAdapter } from "logos/adapters/translators/deepl";
import { GoogleTranslateAdapter } from "logos/adapters/translators/google-translate";
import { Client } from "logos/client";

class TranslatorStore {
	static readonly priority: Translator[] = ["deepl", "google"];

	readonly adapters: {
		readonly deepl: DeepLAdapter;
		readonly google: GoogleTranslateAdapter;
	} & Record<Translator, TranslatorAdapter>;

	constructor(client: Client) {
		this.adapters = {
			deepl: new DeepLAdapter(client),
			google: new GoogleTranslateAdapter(client),
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

		return viableTranslators.map((identifier) => this.adapters[identifier]);
	}
}

export { TranslatorStore };
