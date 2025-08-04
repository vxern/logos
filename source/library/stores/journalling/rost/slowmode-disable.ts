import { mention } from "rost:constants/formatting";
import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"slowmodeDisable"> = (client, [user, channel], { guildLocale }) => {
	const strings = constants.contexts.slowmodeDisable({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.warning,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.slowmode.disabled} ${strings.title}\n${strings.description(
							{
								moderator: client.diagnostics.user(user),
								channel: mention(channel.id, { type: "channel" }),
							},
						)}`,
					},
				],
			},
		],
	};
};

export default logger;
