import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"suggestionSend"> = (client, [member, suggestion], { guildLocale }) => {
	const strings = constants.contexts.suggestionSend({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.success,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.suggestion} ${strings.title}\n${strings.description({ user: client.diagnostics.member(member) })}`,
					},
					{
						type: Discord.MessageComponentTypes.Separator,
						spacing: Discord.SeparatorSpacingSize.Large,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.suggestion}\n${suggestion.formData.suggestion}`,
					},
				],
			},
		],
	};
};

export default logger;
