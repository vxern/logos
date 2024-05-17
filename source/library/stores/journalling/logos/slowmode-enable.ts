import { mention } from "logos:core/formatting";
import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"slowmodeEnable"> = (client, [user, channel, level], { guildLocale }) => {
	const strings = constants.contexts.slowmodeEnable({ localise: client.localise.bind(client), locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.slowmode.enabled} ${strings.title}`,
				color: constants.colours.warning,
				description: strings.description({
					moderator: client.diagnostics.user(user),
					channel: mention(channel.id, { type: "channel" }),
					level,
				}),
			},
		],
	};
};

export default logger;
