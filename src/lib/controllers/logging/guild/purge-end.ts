import constants from "../../../../constants";
import { MentionTypes, mention } from "../../../../formatting";
import { diagnosticMentionUser } from "../../../utils";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.purging.end} Purging complete`,
	message: (client, member, channel, messageCount, author) => {
		const user = client.cache.users.get(member.id);
		if (user === undefined) {
			return;
		}

		const userMention = diagnosticMentionUser(user);
		const authorMention = author !== undefined ? diagnosticMentionUser(author) : undefined;
		const channelMention = mention(channel.id, MentionTypes.Channel);

		return `The purging of ${messageCount} messages${
			author !== undefined ? `sent by ${authorMention}` : ""
		} in ${channelMention} initiated by ${userMention} is complete.`;
	},
	filter: (_, originGuildId, member, __, ___, ____) => originGuildId === member.guildId,
	color: constants.colors.lightGreen,
} satisfies MessageGenerators<GuildEvents>["purgeEnd"];
