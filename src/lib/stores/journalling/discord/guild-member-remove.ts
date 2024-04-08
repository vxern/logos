import { Client } from "logos/client";
import { EventLogger } from "logos/stores/journalling/logger";

class GuildMemberRemoveEventLogger extends EventLogger<"guildMemberRemove"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.user.left} User left`,
			colour: constants.colours.dullYellow,
		});
	}

	buildMessage(user: Discord.User, _: bigint): string {
		return `${this.client.diagnostics.user(user)} has left the server.`;
	}
}

export { GuildMemberRemoveEventLogger };
