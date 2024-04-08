import { codeMultiline, mention } from "logos:core/formatting";
import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"messageDelete"> = async (client, payload, _?) => {
	const message = client.entities.messages.latest.get(payload.id);
	if (message === undefined) {
		return undefined;
	}

	return {
		embeds: [
			{
				title: `${constants.emojis.events.message.deleted} Message deleted`,
				colour: constants.colours.failure,
				description: `${client.diagnostics.user(message.author)} deleted their message in ${mention(message.channelId, {
					type: "channel",
				})}.

**CONTENT**
${codeMultiline(message.content)}`,
			},
		],
	};
};

export default logger;
