import { mention } from "logos:core/formatting";
import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"purgeEnd"> = async (client, member, channel, messageCount, author?) => {
	const authorMention = author !== undefined ? client.diagnostics.user(author) : undefined;
	const channelMention = mention(channel.id, { type: "channel" });

	return {
		embeds: [
			{
				title: `${constants.emojis.events.purging.end} Purging complete`,
				color: constants.colours.success,
				description: `The purging of ${messageCount} messages${
					author !== undefined ? `sent by ${authorMention}` : ""
				} in ${channelMention} initiated by ${client.diagnostics.member(member)} is complete.`,
			},
		],
	};
};

export default logger;
