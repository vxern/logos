import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"reportSubmit"> = (client, [author, report], { guildLocale }) => {
	const strings = constants.contexts.reportSubmit({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.failure,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.report} ${strings.title}\n${strings.description({ user: client.diagnostics.member(author) })}`,
					},
					{
						type: Discord.MessageComponentTypes.Separator,
						spacing: Discord.SeparatorSpacingSize.Large,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.reason}\n${report.formData.reason}`,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.reportedUsers}\n${report.formData.users}`,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.messageLink}\n${report.formData.messageLink}`,
					},
				],
			},
		],
	};
};

export default logger;
