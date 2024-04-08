import { Client } from "logos/client";
import { EventLogger } from "logos/stores/journalling/logger";

class GuildMemberAddEventLogger extends EventLogger<"guildMemberAdd"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.user.joined} User joined`,
			colour: constants.colours.lightGreen,
		});
	}

	filter(originGuildId: bigint, member: Discord.Member, user: Discord.User): boolean {
		return originGuildId === member.guildId && !user.toggles?.has("bot");
	}

	buildMessage(_: Discord.Member, user: Discord.User): string {
		return `${this.client.diagnostics.user(user)} has joined the server.`;
	}
}

export { GuildMemberAddEventLogger };
