import constants from "../../../../constants/constants";
import { MentionTypes, mention } from "../../../../formatting";
import { diagnosticMentionUser } from "../../../utils";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.purging.begin} Purging started`,
	message: (client, member, channel, messageCount, author) => {
		const user = client.cache.users.get(member.id);
		if (user === undefined) {
			return;
		}

		const userMention = diagnosticMentionUser(user);
		const authorMention = author !== undefined ? diagnosticMentionUser(author) : undefined;
		const channelMention = mention(channel.id, MentionTypes.Channel);

		return `${userMention} has initiated a purging of ${messageCount} messages${
			author !== undefined ? `sent by ${authorMention}` : ""
		} in ${channelMention}.`;
	},
	filter: (_, originGuildId, member, __, ___, ____) => originGuildId === member.guildId,
	color: constants.colors.yellow,
} satisfies MessageGenerators<GuildEvents>["purgeBegin"];
