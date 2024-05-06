import { Client } from "logos/client";
import { GlobalService } from "logos/services/service";

class StatusService extends GlobalService {
	#currentIndex: number;

	#_timer?: Timer;

	get status(): string {
		return constants.statuses[this.#currentIndex]!;
	}

	constructor(client: Client) {
		super(client, { identifier: "StatusService" });

		this.#currentIndex = 0;
	}

	async start(): Promise<void> {
		this.#_timer = setInterval(this.#cycleStatus.bind(this), constants.STATUS_CYCLE_PERIOD);
	}

	async stop(): Promise<void> {
		clearInterval(this.#_timer);
		this.#_timer = undefined;

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
			.catch(() => this.log.warn("Unable to edit bot status."));

		if (this.#currentIndex === constants.statuses.length - 1) {
			this.#currentIndex = 0;
		} else {
			this.#currentIndex += 1;
		}
	}
}

export { StatusService };
