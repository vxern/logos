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
				title: `${constants.emojis.events.message.deleted} ${strings.title}`,
				colour: constants.colours.failure,
				description: strings.description({
					user: client.diagnostics.user(message.author),
					channel: mention(message.channelId, { type: "channel" }),
				}),
				fields: [
					{
						name: strings.fields.content,
						value: codeMultiline(message.content),
					},
				],
			},
		],
	};
};

export default logger;
