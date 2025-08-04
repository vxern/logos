import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"memberWarnRemove"> = (client, [member, warning, author], { guildLocale }) => {
	const strings = constants.contexts.memberWarnRemove({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.success,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.pardoned} ${strings.title}\n${strings.description({
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
						content: `### ${strings.fields.warning}\n${warning.reason}`,
					},
				],
			},
		],
	};
};

export default logger;
