import diagnostics from "logos:core/diagnostics";
import { mention } from "logos:core/formatting";
import { Client } from "logos/client";
import { EventLogger } from "logos/journalling/logger";

class PurgeBeginEventLogger extends EventLogger<"purgeBegin"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.purging.begin} Purging started`,
			colour: constants.colours.yellow,
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

		const userMention = diagnostics.display.user(user);
		const authorMention = author !== undefined ? diagnostics.display.user(author) : undefined;
		const channelMention = mention(channel.id, { type: "channel" });

		return `${userMention} has initiated a purging of ${messageCount} messages${
			author !== undefined ? `sent by ${authorMention}` : ""
		} in ${channelMention}.`;
	}
}

export { PurgeBeginEventLogger };
