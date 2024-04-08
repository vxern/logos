import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"entryRequestReject"> = async (client, user, author) => ({
	embeds: [
		{
			title: `${constants.emojis.events.entryRequest.rejected} Entry request rejected`,
			colour: constants.colours.failure,
			description: `${client.diagnostics.user(user)}'s entry request has been rejected by ${client.diagnostics.member(
				author,
			)}`,
		},
	],
});

export default logger;
