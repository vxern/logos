import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"guildMemberRemove"> = async (client, user, _) => ({
	embeds: [
		{
			title: `${constants.emojis.events.user.left} User left`,
			colour: constants.colours.warning,
			description: `${client.diagnostics.user(user)} has left the server.`,
		},
	],
});

export default logger;
