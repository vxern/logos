import * as Discord from "@discordeno/bot";
import { Guild } from "../../database/guild";
import diagnostics from "../../diagnostics";
import { LocalService } from "../service";

type Configuration = NonNullable<Guild["features"]["moderation"]["features"]>["alerts"];

class AlertService extends LocalService {
	get configuration(): Configuration | undefined {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return undefined;
		}

		return guildDocument.features.moderation.features?.alerts;
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

	async alert(message: Discord.CreateMessageOptions): Promise<void> {
		const channelId = this.channelId;
		if (channelId === undefined) {
			return;
		}

		this.bot.rest.sendMessage(channelId, message).catch(() => {
			this.client.log.warn(
				`Failed to send alert to ${diagnostics.display.channel(channelId)} on ${diagnostics.display.guild(
					this.guildId,
				)}.`,
			);
		});
	}
}

export { AlertService };
