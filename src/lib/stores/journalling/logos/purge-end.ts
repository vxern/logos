import { mention } from "logos:core/formatting";
import { Client } from "logos/client";
import { EventLogger } from "logos/stores/journalling/logger";

class PurgeEndEventLogger extends EventLogger<"purgeEnd"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.purging.end} Purging complete`,
			colour: constants.colours.lightGreen,
		});
	}

	buildMessage(
		member: Logos.Member,
		channel: Logos.Channel,
		messageCount: number,
		author?: Logos.User | undefined,
	): string | undefined {
		const user = this.client.entities.users.get(member.id);
		if (user === undefined) {
			return undefined;
		}

		const userMention = this.client.diagnostics.user(user);
		const authorMention = author !== undefined ? this.client.diagnostics.user(author) : undefined;
		const channelMention = mention(channel.id, { type: "channel" });

		return `The purging of ${messageCount} messages${
			author !== undefined ? `sent by ${authorMention}` : ""
		} in ${channelMention} initiated by ${userMention} is complete.`;
	}
}

export { PurgeEndEventLogger };
