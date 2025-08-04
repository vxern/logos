import { mention } from "rost:constants/formatting";
import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"slowmodeUpgrade"> = (
	client,
	[user, channel, previousLevel, currentLevel],
	{ guildLocale },
) => {
	const strings = constants.contexts.slowmodeUpgrade({ localise: client.localise, locale: guildLocale });
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.warning,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.slowmode.upgraded} ${strings.title}\n${strings.description(
							{
								moderator: client.diagnostics.user(user),
								channel: mention(channel.id, { type: "channel" }),
								level_before: previousLevel,
								level_after: currentLevel,
							},
						)}`,
					},
				],
			},
		],
	};
};

export default logger;
