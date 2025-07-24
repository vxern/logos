import type { Client } from "rost/client";
import { DetectorStore } from "rost/stores/adapters/detectors";
import { DictionaryStore } from "rost/stores/adapters/dictionaries";
import { TranslatorStore } from "rost/stores/adapters/translators";

class AdapterStore {
	readonly detectors: DetectorStore;
	readonly dictionaries: DictionaryStore;
	readonly translators: TranslatorStore;

	constructor(client: Client) {
		this.detectors = new DetectorStore(client);
		this.dictionaries = new DictionaryStore(client);
		this.translators = new TranslatorStore(client);
	}
}

export { AdapterStore };
