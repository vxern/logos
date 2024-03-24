import diagnostics from "logos:core/diagnostics";
import { Client } from "logos/client";
import { EventLogger } from "logos/journalling/logger";

class GuildMemberRemoveEventLogger extends EventLogger<"guildMemberRemove"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.user.left} User left`,
			colour: constants.colours.dullYellow,
		});
	}

	filter(originGuildId: bigint, user: Discord.User, guildId: bigint): boolean {
		return originGuildId === guildId && !user.toggles?.has("bot");
	}

	buildMessage(user: Discord.User, _: bigint): string {
		return `${diagnostics.display.user(user)} has left the server.`;
	}
}

export { GuildMemberRemoveEventLogger };
