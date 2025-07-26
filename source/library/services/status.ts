import type { Client } from "rost/client";
import { GlobalService } from "rost/services/service";

class StatusService extends GlobalService {
	constructor(client: Client) {
		super(client, { identifier: "StatusService" });
	}

	async start(): Promise<void> {
		await this.client.bot.gateway
			.editBotStatus({
				activities: [
					{
						// TODO(vxern): Localise.
						name: "Status",
						type: Discord.ActivityTypes.Custom,
						// TODO(vxern): Localise.
						state: "Managing Learn Romanian",
					},
				],
				status: "online",
			})
			.catch((error) => this.log.warn(error, "Unable to edit bot status."));
	}
}

export { StatusService };
