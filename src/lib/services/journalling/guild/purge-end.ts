import diagnostics from "../../../../diagnostics";
import { mention } from "../../../../formatting";
import { Client } from "../../../client";
import { EventLogger } from "../logger";

class PurgeEndEventLogger extends EventLogger<"purgeEnd"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.symbols.events.purging.end} Purging complete`,
			colour: constants.colors.lightGreen,
		});
	}

	filter(
		originGuildId: bigint,
		member: Logos.Member,
		_: Logos.Channel,
		__: number,
		___?: Logos.User | undefined,
	): boolean {
		return originGuildId === member.guildId;
	}

	message(
		member: Logos.Member,
		channel: Logos.Channel,
		messageCount: number,
		author?: Logos.User | undefined,
	): string | undefined {
		const user = this.client.entities.users.get(member.id);
		if (user === undefined) {
			return undefined;
		}

		const userMention = diagnostics.display.user(user);
		const authorMention = author !== undefined ? diagnostics.display.user(author) : undefined;
		const channelMention = mention(channel.id, { type: "channel" });

		return `The purging of ${messageCount} messages${
			author !== undefined ? `sent by ${authorMention}` : ""
		} in ${channelMention} initiated by ${userMention} is complete.`;
	}
}

export { PurgeEndEventLogger };
