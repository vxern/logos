import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"guildMemberKick"> = (client, [user, author], { guildLocale }) => {
	const strings = constants.contexts.memberKick({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.warning,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.user.kicked} ${strings.title}\n${strings.description({
							user: client.diagnostics.user(user),
							moderator: client.diagnostics.member(author),
						})}`,
					},
				],
			},
		],
	};
};

export default logger;
