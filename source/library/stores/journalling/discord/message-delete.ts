import { codeMultiline, mention } from "logos:core/formatting";
import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"messageDelete"> = async (client, [payload, _], { guildLocale }) => {
	const message = client.entities.messages.latest.get(payload.id);
	if (message === undefined) {
		return undefined;
	}

	const files = await downloadAttachments(message.attachments ?? []);

	const strings = constants.contexts.messageDelete({ localise: client.localise.bind(client), locale: guildLocale });
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
		files: files.length > 0 ? files : undefined,
	};
};

async function downloadAttachments(attachments: Discord.Attachment[]): Promise<Discord.FileContent[]> {
	if (attachments.length === 0) {
		return [];
	}

	return Promise.all(
		attachments.map((attachment) =>
			fetch(attachment.url)
				.then((response) => response.blob())
				.then((blob) => ({ name: attachment.filename, blob }) as Discord.FileContent),
		),
	);
}

export default logger;
