import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"inquiryOpen"> = (client, [member, _], { guildLocale }) => {
	const strings = constants.contexts.inquiryOpen({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.notice,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.ticket} ${strings.title}\n${strings.description({ moderator: client.diagnostics.member(member) })}`,
					},
				],
			},
		],
	};
};

export default logger;
