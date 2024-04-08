import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"guildMemberAdd"> = async (client, _, user) => ({
	embeds: [
		{
			title: `${constants.emojis.events.user.joined} User joined`,
			colour: constants.colours.success,
			description: `${client.diagnostics.user(user)} has joined the server.`,
		},
	],
});

export default logger;
