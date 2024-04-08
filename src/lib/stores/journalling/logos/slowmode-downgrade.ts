import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"slowmodeDowngrade"> = async (client, user, channel, previousLevel, currentLevel) => ({
	embeds: [
		{
			title: `${constants.emojis.events.slowmode.downgraded} Slowmode level downgraded`,
			color: constants.colours.warning,
			description: `${client.diagnostics.user(user)} has downgraded the slowmode level in ${client.diagnostics.channel(
				channel,
			)} from "${previousLevel}" to "${currentLevel}".`,
		},
	],
});

export default logger;
