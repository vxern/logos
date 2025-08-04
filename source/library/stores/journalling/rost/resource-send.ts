import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"resourceSend"> = (client, [author, resource], { guildLocale }) => {
	const strings = constants.contexts.resourceSend({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.success,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.resource} ${strings.title}\n${strings.description({ user: client.diagnostics.member(author) })}`,
					},
					{
						type: Discord.MessageComponentTypes.Separator,
						spacing: Discord.SeparatorSpacingSize.Large,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.resource}\n${resource.formData.resource}`,
					},
				],
			},
		],
	};
};

export default logger;
