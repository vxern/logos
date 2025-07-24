import type { Client } from "rost/client";
import { GlobalService } from "rost/services/service";

class StatusService extends GlobalService {
	#currentIndex: number;
	#timer?: globalThis.Timer;

	get status(): string {
		return constants.statuses[this.#currentIndex]!;
	}

	constructor(client: Client) {
		super(client, { identifier: "StatusService" });

		this.#currentIndex = 0;
	}

	async start(): Promise<void> {
		this.#timer = setInterval(this.#cycleStatus.bind(this), constants.STATUS_CYCLE_PERIOD);
	}

	async stop(): Promise<void> {
		clearInterval(this.#timer);
		this.#timer = undefined;

		this.#currentIndex = 0;
	}

	async #cycleStatus(): Promise<void> {
		await this.client.bot.gateway
			.editBotStatus({
				activities: [
					{
						name: this.status,
						type: Discord.ActivityTypes.Streaming,
					},
				],
				status: "online",
			})
			.catch((error) => this.log.warn(error, "Unable to edit bot status."));

		if (this.#currentIndex === constants.statuses.length - 1) {
			this.#currentIndex = 0;
		} else {
			this.#currentIndex += 1;
		}
	}
}

export { StatusService };
