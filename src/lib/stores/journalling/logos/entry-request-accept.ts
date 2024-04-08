import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"entryRequestAccept"> = async (client, user, author) => ({
	embeds: [
		{
			title: `${constants.emojis.events.entryRequest.accepted} Entry request accepted`,
			colour: constants.colours.success,
			description: `${client.diagnostics.user(user)}'s entry request has been accepted by ${client.diagnostics.member(
				author,
			)}`,
		},
	],
});

export default logger;
