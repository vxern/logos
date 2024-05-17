import { codeMultiline, mention } from "logos:core/formatting";
import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"messageUpdate"> = (client, [message, _], { guildLocale }) => {
	const oldMessage = client.entities.messages.previous.get(message.id);
	if (oldMessage === undefined) {
		return undefined;
	}

	if (oldMessage.content === undefined || message.content === undefined) {
		return undefined;
	}

	const strings = constants.contexts.messageUpdate({ localise: client.localise.bind(client), locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.message.updated} ${strings.title}`,
				color: constants.colours.notice,
				description: strings.description({
					user: client.diagnostics.user(message.author),
					channel: mention(message.channelId, { type: "channel" }),
				}),
				fields: [
					{
						name: strings.fields.before,
						value: codeMultiline(oldMessage.content),
					},
					{
						name: strings.fields.after,
						value: codeMultiline(message.content),
					},
				],
			},
		],
	};
};

export default logger;
