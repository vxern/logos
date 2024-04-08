import { codeMultiline, mention } from "logos:core/formatting";
import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"messageUpdate"> = async (client, message, _?) => {
	const oldMessage = client.entities.messages.previous.get(message.id);
	if (oldMessage === undefined) {
		return undefined;
	}

	return {
		embeds: [
			{
				title: `${constants.emojis.events.message.updated} Message updated`,
				color: constants.colours.notice,
				description: `${client.diagnostics.user(message.author)} updated their message in ${mention(message.channelId, {
					type: "channel",
				})}.
  
  **BEFORE**
  ${codeMultiline(oldMessage.content)}
  **AFTER**
  ${codeMultiline(message.content)}`,
			},
		],
	};
};

export default logger;
