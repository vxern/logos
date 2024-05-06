import { mention } from "logos:core/formatting";
import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"slowmodeUpgrade"> = async (
	client,
	[user, channel, previousLevel, currentLevel],
	{ guildLocale },
) => {
	const strings = constants.contexts.slowmodeUpgrade({ localise: client.localise.bind(client), locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.slowmode.upgraded} ${strings.title}`,
				color: constants.colours.warning,
				description: strings.description({
					user: client.diagnostics.user(user),
					channel: mention(channel.id, { type: "channel" }),
					level_before: previousLevel,
					level_after: currentLevel,
				}),
			},
		],
	};
};

export default logger;
