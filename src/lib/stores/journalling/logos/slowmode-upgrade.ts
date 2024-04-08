import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"slowmodeUpgrade"> = async (client, user, channel, previousLevel, currentLevel) => ({
	embeds: [
		{
			title: `${constants.emojis.events.slowmode.upgraded} Slowmode level upgraded`,
			color: constants.colours.warning,
			description: `${client.diagnostics.user(user)} has upgraded the slowmode level in ${client.diagnostics.channel(
				channel,
			)} from "${previousLevel}" to "${currentLevel}".`,
		},
	],
});

export default logger;
