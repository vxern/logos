import { timestamp } from "rost:constants/formatting";
import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"memberTimeoutAdd"> = (client, [member, until, reason, author], { guildLocale }) => {
	const strings = constants.contexts.memberTimeoutAdd({
		localise: client.localise,
		locale: guildLocale,
	});
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.warning,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.timeout.added} ${strings.title}\n${strings.description({
							user: client.diagnostics.member(member),
							moderator: client.diagnostics.user(author),
						})}`,
					},
					{
						type: Discord.MessageComponentTypes.Separator,
						spacing: Discord.SeparatorSpacingSize.Large,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.reason}\n${reason}`,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.lastsUntil}\n${timestamp(until, { format: "relative" })}`,
					},
				],
			},
		],
	};
};

export default logger;
