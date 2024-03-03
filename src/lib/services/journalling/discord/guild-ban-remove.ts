import diagnostics from "../../../../diagnostics";
import { Client } from "../../../client";
import { EventLogger } from "../logger";

class GuildBanRemoveEventLogger extends EventLogger<"guildBanRemove"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.symbols.events.user.unbanned} User unbanned`,
			colour: constants.colors.dullYellow,
		});
	}

	filter(originGuildId: bigint, user: Discord.User, guildId: bigint): boolean {
		return originGuildId === guildId && !user.toggles?.has("bot");
	}

	message(user: Discord.User, _: bigint): string {
		return `${diagnostics.display.user(user)} has been unbanned.`;
	}
}

export { GuildBanRemoveEventLogger };
