import { Client } from "logos/client";
import { EventLogger } from "logos/journalling/logger";

class GuildBanAddEventLogger extends EventLogger<"guildBanAdd"> {
	constructor(client: Client) {
		super(client, { title: `${constants.emojis.events.user.banned} User banned`, colour: constants.colours.red });
	}

	filter(originGuildId: bigint, user: Discord.User, guildId: bigint): boolean {
		return originGuildId === guildId && !user.toggles?.has("bot");
	}

	buildMessage(user: Discord.User, _: bigint): string {
		return `${this.client.diagnostics.user(user)} has been banned.`;
	}
}

export { GuildBanAddEventLogger };
