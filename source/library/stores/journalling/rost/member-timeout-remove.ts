import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"memberTimeoutRemove"> = (client, [member, author], { guildLocale }) => {
	const strings = constants.contexts.memberTimeoutRemove({
		localise: client.localise,
		locale: guildLocale,
	});
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.notice,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.timeout.removed} ${strings.title}\n${strings.description({
							user: client.diagnostics.member(member),
							moderator: client.diagnostics.user(author),
						})}`,
					},
				],
			},
		],
	};
};

export default logger;
