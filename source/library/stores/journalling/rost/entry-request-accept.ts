import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"entryRequestAccept"> = (client, [user, author], { guildLocale }) => {
	const strings = constants.contexts.entryRequestAccept({
		localise: client.localise,
		locale: guildLocale,
	});
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.success,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.entryRequest.accepted} ${strings.title}\n${strings.description(
							{
								user: client.diagnostics.user(user),
								moderator: client.diagnostics.member(author),
							},
						)}`,
					},
				],
			},
		],
	};
};

export default logger;
