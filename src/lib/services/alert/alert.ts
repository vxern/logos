import diagnostics from "../../../diagnostics";
import { Client } from "../../client";
import { Guild } from "../../database/guild";
import { LocalService } from "../service";

class AlertService extends LocalService {
	get configuration(): Guild["alerts"] {
		return this.guildDocument?.alerts;
	}

	get channelId(): bigint | undefined {
		const configuration = this.configuration;
		if (configuration === undefined) {
			return undefined;
		}

		const channelId = BigInt(configuration.channelId);
		if (channelId === undefined) {
			return undefined;
		}

		return channelId;
	}

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "AlertService", guildId });
	}

	async start(): Promise<void> {}
	async stop(): Promise<void> {}

	async alert(message: Discord.CreateMessageOptions): Promise<void> {
		const channelId = this.channelId;
		if (channelId === undefined) {
			return;
		}

		this.client.bot.rest
			.sendMessage(channelId, message)
			.catch(() =>
				this.log.warn(
					`Failed to send alert to ${diagnostics.display.channel(channelId)} on ${diagnostics.display.guild(
						this.guildId,
					)}.`,
				),
			);
	}
}

export { AlertService };
