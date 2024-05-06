import { Client } from "logos/client";
import { DetectorStore } from "logos/stores/adapters/detectors";
import { TranslatorStore } from "logos/stores/adapters/translators";

class AdapterStore {
	readonly detectors: DetectorStore;
	readonly translators: TranslatorStore;

	constructor(client: Client) {
		this.detectors = new DetectorStore(client);
		this.translators = new TranslatorStore(client);
	}
}

export { AdapterStore };
