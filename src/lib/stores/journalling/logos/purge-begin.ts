import { mention } from "logos:core/formatting";
import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"purgeBegin"> = async (client, member, channel, messageCount, author?) => {
	const authorMention = author !== undefined ? client.diagnostics.user(author) : undefined;
	const channelMention = mention(channel.id, { type: "channel" });

	return {
		embeds: [
			{
				title: `${constants.emojis.events.purging.begin} Purging started`,
				color: constants.colours.warning,
				description: `${client.diagnostics.member(member)} has initiated a purging of ${messageCount} messages${
					author !== undefined ? `sent by ${authorMention}` : ""
				} in ${channelMention}.`,
			},
		],
	};
};

export default logger;
