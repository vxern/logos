import { GlobalService } from "../service";
import * as Discord from "discordeno";

class StatusService extends GlobalService {
	async start(bot: Discord.Bot): Promise<void> {
		await Discord.editBotStatus(bot, {
			activities: [
				{
					name: `v${this.client.metadata.environment.version}`,
					type: Discord.ActivityTypes.Streaming,
					createdAt: Date.now(),
				},
			],
			status: "online",
		}).catch(() => {
			this.client.log.warn("Unable to edit bot status.");
		});
	}
}

export { StatusService };
