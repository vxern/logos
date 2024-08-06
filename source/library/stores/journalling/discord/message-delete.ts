import { codeMultiline, mention } from "logos:core/formatting";
import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"messageDelete"> = (client, [payload, _], { guildLocale }) => {
	const message = client.entities.messages.latest.get(payload.id);
	if (message === undefined) {
		return undefined;
	}

	const fileContents: Discord.FileContent[] = [];
	for (const attachment of message.attachments ?? []) {
		const fileContent = client.entities.messages.fileContents.get(attachment.id);
		if (fileContent === undefined) {
			continue;
		}

		fileContents.push(fileContent);
	}

	const strings = constants.contexts.messageDelete({ localise: client.localise, locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.message.deleted} ${strings.title}`,
				color: constants.colours.failure,
				description: strings.description({
					user: client.diagnostics.user(message.author),
					channel: mention(message.channelId, { type: "channel" }),
				}),
				fields:
					message.content !== undefined
						? [
								{
									name: strings.fields.content,
									value: codeMultiline(message.content),
								},
							]
						: undefined,
			},
		],
		files: fileContents.length > 0 ? fileContents : undefined,
	};
};

export default logger;
