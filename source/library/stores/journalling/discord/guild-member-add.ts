import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"guildMemberAdd"> = (client, [_, user], { guildLocale }) => {
	const strings = constants.contexts.guildMemberAdd({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.success,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.user.joined} ${strings.title}\n${strings.description({ user: client.diagnostics.user(user) })}`,
					},
				],
			},
		],
	};
};

export default logger;
