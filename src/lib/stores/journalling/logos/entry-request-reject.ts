import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"entryRequestReject"> = async (client, user, author) => ({
	embeds: [
		{
			title: `${constants.emojis.events.entryRequest.rejected} ${strings.title}`,
			colour: constants.colours.failure,
			description: strings.description({
				user: client.diagnostics.user(user),
				moderator: client.diagnostics.member(author),
			}),
		},
	],
});

export default logger;
