import type { Client } from "logos/client";
import type { Guild } from "logos/models/guild";
import { LocalService } from "logos/services/service";

class AlertService extends LocalService {
	get configuration(): NonNullable<Guild["features"]["alerts"]> {
		return this.guildDocument.feature("alerts");
	}

	get channelId(): bigint | undefined {
		return this.configuration.channelId !== undefined ? BigInt(this.configuration.channelId) : undefined;
	}

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "AlertService", guildId });
	}

	async alert(message: Discord.CreateMessageOptions): Promise<void> {
		const channelId = this.channelId;
		if (channelId === undefined) {
			return;
		}

		this.client.bot.helpers
			.sendMessage(channelId, message)
			.catch((error) =>
				this.log.warn(
					error,
					`Failed to send alert to ${this.client.diagnostics.channel(
						channelId,
					)} on ${this.client.diagnostics.guild(this.guildId)}.`,
				),
			);
	}
}

export { AlertService };
