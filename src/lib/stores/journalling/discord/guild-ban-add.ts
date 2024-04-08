import { Client } from "logos/client";
import { EventLogger } from "logos/stores/journalling/logger";

class GuildBanAddEventLogger extends EventLogger<"guildBanAdd"> {
	constructor(client: Client) {
		super(client, { title: `${constants.emojis.events.user.banned} User banned`, colour: constants.colours.red });
	}

	buildMessage(user: Discord.User, _: bigint): string {
		return `${this.client.diagnostics.user(user)} has been banned.`;
	}
}

export { GuildBanAddEventLogger };
