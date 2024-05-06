import { mention } from "logos:core/formatting";
import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"slowmodeDisable"> = async (client, [user, channel], { guildLocale }) => {
	const strings = constants.contexts.slowmodeDisable({ localise: client.localise, locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.slowmode.disabled} ${strings.title}`,
				color: constants.colours.warning,
				description: strings.description({
					user: client.diagnostics.user(user),
					channel: mention(channel.id, { type: "channel" }),
				}),
			},
		],
	};
};

export default logger;
