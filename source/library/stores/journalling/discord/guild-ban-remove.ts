import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"guildBanRemove"> = (client, [user, _], { guildLocale }) => {
	const strings = constants.contexts.guildBanRemove({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.success,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.user.unbanned} ${strings.title}\n${strings.description({ user: client.diagnostics.user(user) })}`,
					},
				],
			},
		],
	};
};

export default logger;
