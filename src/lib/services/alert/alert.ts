import { Guild } from "../../database/structs/guild";
import { LocalService } from "../service";
import * as Discord from "discordeno";

type Configuration = NonNullable<Guild["features"]["moderation"]["features"]>["alerts"];

class AlertService extends LocalService {
	get configuration(): Configuration | undefined {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return undefined;
		}

		return guildDocument.data.features.moderation.features?.alerts;
	}

	get channelId(): bigint | undefined {
		const configuration = this.configuration;
		if (configuration === undefined) {
			return undefined;
		}

		if (!configuration.enabled) {
			return undefined;
		}

		const channelId = BigInt(configuration.channelId);
		if (channelId === undefined) {
			return undefined;
		}

		return channelId;
	}

	async alert(bot: Discord.Bot, message: Discord.CreateMessage): Promise<void> {
		const channelId = this.channelId;
		if (channelId === undefined) {
			return;
		}

		Discord.sendMessage(bot, channelId, message).catch(() => {
			this.client.log.warn(`Failed to send alert to channel with ID ${channelId} on guild with ID ${this.guildId}`);
		});
	}
}

export { AlertService };
