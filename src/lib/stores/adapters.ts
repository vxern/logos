import { Client } from "logos/client";
import { DetectorStore } from "./adapters/detectors";
import { TranslatorStore } from "./adapters/translators";

class AdapterStore {
	readonly detectors: DetectorStore;
	readonly translators: TranslatorStore;

	constructor(client: Client) {
		this.detectors = new DetectorStore(client);
		this.translators = new TranslatorStore(client);
	}
}

export { AdapterStore };
