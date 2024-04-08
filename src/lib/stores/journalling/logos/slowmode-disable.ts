import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"slowmodeDisable"> = async (client, user, channel) => ({
	embeds: [
		{
			title: `${constants.emojis.events.slowmode.disabled} Slowmode disabled`,
			color: constants.colours.warning,
			description: `${client.diagnostics.user(user)} has disabled slowmode in ${client.diagnostics.channel(channel)}.`,
		},
	],
});

export default logger;
