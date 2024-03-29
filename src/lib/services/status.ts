import { Client } from "logos/client";
import { GlobalService } from "logos/services/service";

class StatusService extends GlobalService {
	#currentIndex: number;

	constructor(client: Client) {
		super(client, { identifier: "StatusService" });

		this.#currentIndex = 0;
	}

	get status(): string | undefined {
		return constants.statuses[this.#currentIndex];
	}

	async start(): Promise<void> {
		if (constants.statuses.length === 0) {
			return;
		}

		this.#cycleStatus();
	}

	async stop(): Promise<void> {
		this.#currentIndex = 0;
	}

	#cycleStatus(): void {
		const status = this.status;
		if (status === undefined) {
			this.#currentIndex = 0;
			this.#cycleStatus();
			return;
		}

		if (this.#currentIndex === constants.statuses.length - 1) {
			this.#currentIndex = 0;
		} else {
			this.#currentIndex += 1;
		}

		this.client.bot.gateway
			.editBotStatus({
				activities: [
					{
						name: status,
						type: Discord.ActivityTypes.Streaming,
					},
				],
				status: "online",
			})
			.catch(() => this.log.warn("Unable to edit bot status."));

		setTimeout(() => this.#cycleStatus(), constants.STATUS_CYCLE_PERIOD);
	}
}

export { StatusService };
