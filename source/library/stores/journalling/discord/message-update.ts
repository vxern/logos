import { codeMultiline, mention, trim } from "rost:constants/formatting";
import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"messageUpdate"> = (client, [message], { guildLocale }) => {
	const oldMessage = client.entities.messages.previous.get(message.id);
	if (oldMessage === undefined) {
		return undefined;
	}

	if (oldMessage.content === undefined || message.content === undefined) {
		return undefined;
	}

	const strings = constants.contexts.messageUpdate({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.notice,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.message.updated} ${strings.title}\n${strings.description({
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
						content: `### ${strings.fields.before}\n${codeMultiline(
							trim(oldMessage.content, constants.discord.MAXIMUM_EMBED_FIELD_LENGTH - 6),
						)}`,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.after}\n${codeMultiline(trim(message.content, constants.discord.MAXIMUM_EMBED_FIELD_LENGTH - 6))}`,
					},
				],
			},
		],
	};
};

export default logger;
