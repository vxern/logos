import { codeMultiline, mention } from "rost:constants/formatting";
import { isDefined } from "rost:core/utilities";
import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"messageDelete"> = (client, [payload, _], { guildLocale }) => {
	const message = client.entities.messages.latest.get(payload.id);
	if (message === undefined) {
		return undefined;
	}

	const strings = constants.contexts.messageDelete({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.failure,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.message.deleted} ${strings.title}\n${strings.description({
							user: client.diagnostics.user(message.author),
							channel: mention(message.channelId, { type: "channel" }),
						})}`,
					},
					{
						type: Discord.MessageComponentTypes.Separator,
						spacing: Discord.SeparatorSpacingSize.Large,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.content}\n${codeMultiline(message.content)}`,
					},
				],
			},
		],
		files: message.attachments
			?.map((attachment) => client.entities.attachments.get(attachment.id))
			.filter(isDefined),
	};
};

export default logger;
