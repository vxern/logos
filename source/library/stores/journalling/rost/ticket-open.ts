import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"ticketOpen"> = (client, [member, ticket], { guildLocale }) => {
	const strings = constants.contexts.ticketOpen({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.success,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.ticket} ${strings.title}\n${strings.description({ user: client.diagnostics.member(member) })}`,
					},
					{
						type: Discord.MessageComponentTypes.Separator,
						spacing: Discord.SeparatorSpacingSize.Large,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.topic}\n${ticket.formData.topic}`,
					},
				],
			},
		],
	};
};

export default logger;
