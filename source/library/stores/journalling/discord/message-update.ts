import { codeMultiline, mention, trim } from "logos:core/formatting";
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
						value: codeMultiline(trim(oldMessage.content, constants.MAXIMUM_EMBED_FIELD_LENGTH - 6)),
					},
					{
						name: strings.fields.after,
						value: codeMultiline(trim(message.content, constants.MAXIMUM_EMBED_FIELD_LENGTH - 6)),
					},
				],
			},
		],
	};
};

export default logger;