import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"memberWarnRemove"> = async (client, member, warning, author) => ({
	embeds: [
		{
			title: `${constants.emojis.events.pardoned} Member pardoned`,
			color: constants.colours.success,
			description: `${client.diagnostics.member(member)} has been pardoned by ${client.diagnostics.user(
				author,
			)} regarding their warning for: ${warning.reason}`,
		},
	],
});

export default logger;
