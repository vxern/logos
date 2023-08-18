import { GlobalService } from "../service";
import * as Discord from "@discordeno/bot";

class StatusService extends GlobalService {
	async start(): Promise<void> {
		this.bot.gateway
			.editBotStatus({
				activities: [
					{
						name: `v${this.client.metadata.environment.version}`,
						type: Discord.ActivityTypes.Streaming,
					},
				],
				status: "online",
			})
			.catch(() => {
				this.client.log.warn("Unable to edit bot status.");
			});
	}
}

export { StatusService };
