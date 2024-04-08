import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"guildBanRemove"> = async (client, user, _) => ({
	embeds: [
		{
			title: `${constants.emojis.events.user.unbanned} User unbanned`,
			colour: constants.colours.success,
			description: `${client.diagnostics.user(user)} has been unbanned.`,
		},
	],
});

export default logger;
