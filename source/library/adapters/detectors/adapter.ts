import type { DetectionLanguage } from "logos:constants/languages/detection";
import type { Licence } from "logos:constants/licences";
import type { Client } from "logos/client";
import type pino from "pino";

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
