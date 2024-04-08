import { Client } from "logos/client";
import { EventLogger } from "logos/stores/journalling/logger";

class GuildBanRemoveEventLogger extends EventLogger<"guildBanRemove"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.user.unbanned} User unbanned`,
			colour: constants.colours.dullYellow,
		});
	}

	buildMessage(user: Discord.User, _: bigint): string {
		return `${this.client.diagnostics.user(user)} has been unbanned.`;
	}
}

export { GuildBanRemoveEventLogger };
