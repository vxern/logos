import type { Dictionary } from "rost:constants/dictionaries";
import type { LearningLanguage } from "rost:constants/languages/learning";
import { isDefined } from "rost:core/utilities";
import type pino from "pino";
import type { DictionaryAdapter } from "rost/adapters/dictionaries/adapter";
import { DexonlineAdapter } from "rost/adapters/dictionaries/adapters/dexonline";
import { DicolinkAdapter } from "rost/adapters/dictionaries/adapters/dicolink";
import { WiktionaryAdapter } from "rost/adapters/dictionaries/adapters/wiktionary";
import { WordnikAdapter } from "rost/adapters/dictionaries/adapters/wordnik";
import { WordsAPIAdapter } from "rost/adapters/dictionaries/adapters/words-api";
import type { Client } from "rost/client";

class DictionaryStore {
	readonly log: pino.Logger;
	readonly adapters: {
		readonly dexonline: DexonlineAdapter;
		readonly dicolink?: DicolinkAdapter;
		readonly wiktionary: WiktionaryAdapter;
		readonly wordnik?: WordsAPIAdapter;
		readonly "words-api"?: WordsAPIAdapter;
	} & Partial<Record<Dictionary, DictionaryAdapter>>;

	constructor(client: Client) {
		this.log = client.log.child({ name: "DictionaryStore" });

		const dicolinkAdapter = DicolinkAdapter.tryCreate(client);
		if (dicolinkAdapter === undefined) {
			this.log.warn("`SECRET_RAPID_API` has not been provided. Rost will run without a Dicolink integration.");
		}

		const wordnikAdapter = WordnikAdapter.tryCreate(client);
		if (wordnikAdapter === undefined) {
			this.log.warn("`SECRET_WORDNIK` has not been provided. Rost will run without a Wordnik integration.");
		}

		const wordsApiAdapter = WordsAPIAdapter.tryCreate(client);
		if (wordsApiAdapter === undefined) {
			this.log.warn("`SECRET_RAPID_API` has not been provided. Rost will run without a WordsAPI integration.");
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
