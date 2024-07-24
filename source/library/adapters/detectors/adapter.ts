import type { DetectionLanguage } from "logos:constants/languages/detection";
import type { Licence } from "logos:constants/licences.ts";
import type { Client } from "logos/client";
import { Logger } from "logos/logger";

interface SingleDetectionResult {
	readonly language: DetectionLanguage;
	readonly source: Licence;
}

abstract class DetectorAdapter {
	readonly log: Logger;
	readonly client: Client;

	constructor(client: Client, { identifier }: { identifier: string }) {
		this.log = Logger.create({ identifier, isDebug: client.environment.isDebug });
		this.client = client;
	}

	abstract detect({
		text,
	}: { text: string }): SingleDetectionResult | Promise<SingleDetectionResult | undefined> | undefined;
}

export { DetectorAdapter };
export type { SingleDetectionResult };
