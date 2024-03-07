import diagnostics from "../../../diagnostics";
import { Client } from "../../client";
import { EventLogger } from "../logger";

class GuildMemberAddEventLogger extends EventLogger<"guildMemberAdd"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.symbols.events.user.joined} User joined`,
			colour: constants.colors.lightGreen,
		});
	}

	filter(originGuildId: bigint, member: Discord.Member, user: Discord.User): boolean {
		return originGuildId === member.guildId && !user.toggles?.has("bot");
	}

	buildMessage(_: Discord.Member, user: Discord.User): string {
		return `${diagnostics.display.user(user)} has joined the server.`;
	}
}

export { GuildMemberAddEventLogger };
