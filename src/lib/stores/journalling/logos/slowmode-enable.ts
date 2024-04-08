import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"slowmodeEnable"> = async (client, user, channel, level) => ({
	embeds: [
		{
			title: `${constants.emojis.events.slowmode.enabled} Slowmode enabled`,
			color: constants.colours.warning,
			description: `${client.diagnostics.user(user)} has enabled slowmode in ${client.diagnostics.channel(
				channel,
			)} with level "${level}".`,
		},
	],
});

export default logger;
