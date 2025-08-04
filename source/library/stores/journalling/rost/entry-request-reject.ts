import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"entryRequestReject"> = (client, [user, author], { guildLocale }) => {
	const strings = constants.contexts.entryRequestReject({
		localise: client.localise,
		locale: guildLocale,
	});
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.failure,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.entryRequest.rejected} ${strings.title}\n${strings.description(
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
