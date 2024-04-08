import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"guildBanAdd"> = async (client, user, _) => ({
	embeds: [
		{
			title: `${constants.emojis.events.user.banned} User banned`,
			colour: constants.colours.failure,
			description: `${client.diagnostics.user(user)} has been banned.`,
		},
	],
});

export default logger;
