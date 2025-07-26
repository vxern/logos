import type { Client } from "rost/client";
import { Collector } from "rost/collectors";
import { GlobalService } from "rost/services/service";

class StatusService extends GlobalService {
	readonly #readies: Collector<"ready">;

	constructor(client: Client) {
		super(client, { identifier: "StatusService" });

		this.#readies = new Collector();
	}

	async start(): Promise<void> {
		this.#readies.onCollect(this.#setBotStatus.bind(this));

		this.client.registerCollector("ready", this.#readies);
	}

	async #setBotStatus(): Promise<void> {
		await this.client.bot.gateway
			.editBotStatus({
				activities: [
					{
						// TODO(vxern): Localise.
						name: "Status",
						type: Discord.ActivityTypes.Custom,
						// TODO(vxern): Localise.
						state: "Managing 🇷🇴 Learn Romanian",
					},
				],
				status: "online",
			})
			.catch((error) => this.log.warn(error, "Unable to edit bot status."));
	}
}

export { StatusService };
