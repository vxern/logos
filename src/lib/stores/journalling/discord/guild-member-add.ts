import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"guildMemberAdd"> = async (client, _, user) => ({
	embeds: [
		{
			title: `${constants.emojis.events.user.joined} ${strings.title}`,
			colour: constants.colours.success,
			description: strings.description({ user: client.diagnostics.user(user) }),
		},
	],
});

export default logger;
