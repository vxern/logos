import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"memberWarnAdd"> = (client, [member, warning, author], { guildLocale }) => {
	const strings = constants.contexts.memberWarnAdd({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.warning,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.warned} ${strings.title}\n${strings.description({
							user: client.diagnostics.member(member),
							moderator: client.diagnostics.user(author),
						})}`,
					},
					{
						type: Discord.MessageComponentTypes.Separator,
						spacing: Discord.SeparatorSpacingSize.Large,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.reason}\n${warning.reason}`,
					},
				],
			},
		],
	};
};

export default logger;
