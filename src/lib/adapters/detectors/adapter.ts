import { Client } from "logos/client";
import { Logger } from "logos/logger";
import { DetectionLanguage } from "logos:constants/languages";

interface SingleDetectionResult {
	readonly language: DetectionLanguage;
}

abstract class DetectorAdapter {
	readonly logger: Logger;
	readonly client: Client;

	constructor(client: Client, { identifier }: { identifier: string }) {
		this.logger = Logger.create({ identifier, isDebug: client.environment.isDebug });
		this.client = client;
	}

	abstract detect({ text }: { text: string }): Promise<SingleDetectionResult | undefined>;
}

export { DetectorAdapter };
export type { SingleDetectionResult };
