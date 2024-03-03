import diagnostics from "../../../diagnostics";
import { Client } from "../../client";
import { EventLogger } from "../../services/journalling/logger";

class GuildBanAddEventLogger extends EventLogger<"guildBanAdd"> {
	constructor(client: Client) {
		super(client, { title: `${constants.symbols.events.user.banned} User banned`, colour: constants.colors.red });
	}

	filter(originGuildId: bigint, user: Discord.User, guildId: bigint): boolean {
		return originGuildId === guildId && !user.toggles?.has("bot");
	}

	message(user: Discord.User, _: bigint): string {
		return `${diagnostics.display.user(user)} has been banned.`;
	}
}

export { GuildBanAddEventLogger };
