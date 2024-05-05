import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"guildMemberRemove"> = async (client, user, _) => ({
	embeds: [
		{
			title: `${constants.emojis.events.user.left} ${strings.title}`,
			colour: constants.colours.warning,
			description: strings.description({ user: client.diagnostics.user(user) }),
		},
	],
});

export default logger;
