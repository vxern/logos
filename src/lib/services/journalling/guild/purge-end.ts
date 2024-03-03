import diagnostics from "../../../../diagnostics";
import { mention } from "../../../../formatting";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.purging.end} Purging complete`,
	message: (client, member, channel, messageCount, author) => {
		const user = client.entities.users.get(member.id);
		if (user === undefined) {
			return;
		}

		const userMention = diagnostics.display.user(user);
		const authorMention = author !== undefined ? diagnostics.display.user(author) : undefined;
		const channelMention = mention(channel.id, { type: "channel" });

		return `The purging of ${messageCount} messages${
			author !== undefined ? `sent by ${authorMention}` : ""
		} in ${channelMention} initiated by ${userMention} is complete.`;
	},
	filter: (_, originGuildId, member, __, ___, ____) => originGuildId === member.guildId,
	color: constants.colors.lightGreen,
} satisfies MessageGenerators<GuildEvents>["purgeEnd"];
