import type { DetectionLanguage } from "rost:constants/languages/detection";
import type { Licence } from "rost:constants/licences";
import type pino from "pino";
import type { Client } from "rost/client";

interface SingleDetectionResult {
	readonly language: DetectionLanguage;
	readonly source: Licence;
}

abstract class DetectorAdapter {
	readonly log: pino.Logger;
	readonly client: Client;

	constructor(client: Client, { identifier }: { identifier: string }) {
		this.log = client.log.child({ name: identifier });
		this.client = client;
	}

	abstract detect({ text }: { text: string }): Promise<SingleDetectionResult | undefined>;
}

export { DetectorAdapter };
export type { SingleDetectionResult };
