import { Dictionary } from "logos:constants/dictionaries";
import { LearningLanguage } from "logos:constants/languages";
import { isDefined } from "logos:core/utilities";
import { DictionaryAdapter } from "logos/adapters/dictionaries/adapter";
import { DexonlineAdapter } from "logos/adapters/dictionaries/dexonline";
import { DicolinkAdapter } from "logos/adapters/dictionaries/dicolink";
import { WiktionaryAdapter } from "logos/adapters/dictionaries/wiktionary";
import { WordsAPIAdapter } from "logos/adapters/dictionaries/words-api";
import { Client } from "logos/client";
import { Logger } from "logos/logger";

class DictionaryStore {
	readonly log: Logger;
	readonly adapters: {
		readonly dexonline: DexonlineAdapter;
		readonly wiktionary: WiktionaryAdapter;
		dicolink?: DicolinkAdapter;
		"words-api"?: WordsAPIAdapter;
	} & Partial<Record<Dictionary, DictionaryAdapter>>;

	constructor(client: Client) {
		this.log = Logger.create({ identifier: "Client/DictionaryStore", isDebug: client.environment.isDebug });
		this.adapters = {
			dexonline: new DexonlineAdapter(client),
			wiktionary: new WiktionaryAdapter(client),
		};

		if (client.environment.rapidApiSecret !== undefined) {
			this.adapters.dicolink = new DicolinkAdapter(client);
			this.adapters["words-api"] = new WordsAPIAdapter(client);
		} else {
			this.log.warn(
				"`SECRET_RAPIDAPI` has not been provided. Logos will run without its Dicolink and WordsAPI" +
					" integrations.",
			);
		}
	}

	getAdapters({ learningLanguage }: { learningLanguage: LearningLanguage }): DictionaryAdapter[] {
		const identifiers = constants.dictionaries.languages[learningLanguage];

		return identifiers.map((identifier) => this.adapters[identifier]).filter(isDefined);
	}
}

export { DictionaryStore };
