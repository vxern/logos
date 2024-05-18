import type { Dictionary } from "logos:constants/dictionaries";
import type { LearningLanguage } from "logos:constants/languages";
import { isDefined } from "logos:core/utilities";
import type { DictionaryAdapter } from "logos/adapters/dictionaries/adapter";
import { DexonlineAdapter } from "logos/adapters/dictionaries/dexonline";
import { DicolinkAdapter } from "logos/adapters/dictionaries/dicolink";
import { WiktionaryAdapter } from "logos/adapters/dictionaries/wiktionary";
import { WordsAPIAdapter } from "logos/adapters/dictionaries/words-api";
import type { Client } from "logos/client";
import { Logger } from "logos/logger";

class DictionaryStore {
	readonly log: Logger;
	readonly adapters: {
		readonly dexonline: DexonlineAdapter;
		readonly dicolink?: DicolinkAdapter;
		readonly wiktionary: WiktionaryAdapter;
		readonly "words-api"?: WordsAPIAdapter;
	} & Partial<Record<Dictionary, DictionaryAdapter>>;

	constructor(client: Client) {
		this.log = Logger.create({ identifier: "Client/DictionaryStore", isDebug: client.environment.isDebug });

		const dicolinkAdapter = DicolinkAdapter.tryCreate(client);
		if (dicolinkAdapter === undefined) {
			this.log.warn("`SECRET_RAPID_API` has not been provided. Logos will run without a Dicolink integration.");
		}

		const wordsApiAdapter = WordsAPIAdapter.tryCreate(client);
		if (wordsApiAdapter === undefined) {
			this.log.warn("`SECRET_RAPID_API` has not been provided. Logos will run without a WordsAPI integration.");
		}

		this.adapters = {
			dexonline: new DexonlineAdapter(client),
			dicolink: dicolinkAdapter,
			wiktionary: new WiktionaryAdapter(client),
			"words-api": wordsApiAdapter,
		};
	}

	getAdapters({ learningLanguage }: { learningLanguage: LearningLanguage }): DictionaryAdapter[] {
		const identifiers = constants.dictionaries.languages[learningLanguage];

		return identifiers.map((identifier) => this.adapters[identifier]).filter(isDefined);
	}
}

export { DictionaryStore };
