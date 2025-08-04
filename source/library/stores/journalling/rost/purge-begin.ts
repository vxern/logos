import { mention } from "rost:constants/formatting";
import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"purgeBegin"> = (client, [member, channel, messageCount, author], { guildLocale }) => {
	const strings = constants.contexts.purgeBegin({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.warning,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.purging.begin} ${strings.title}\n${strings.description({
							moderator: client.diagnostics.member(member),
							messages: client.pluralise("events.purgeBegin.description.messages", guildLocale, {
								quantity: messageCount,
							}),
							channel: mention(channel.id, { type: "channel" }),
						})}`,
					},
					{
						type: Discord.MessageComponentTypes.Separator,
						spacing: Discord.SeparatorSpacingSize.Large,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.author}\n${client.diagnostics.user(author!)}`,
					},
				],
			},
		],
	};
};

export default logger;
