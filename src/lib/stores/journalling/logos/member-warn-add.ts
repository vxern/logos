import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"memberWarnAdd"> = async (client, member, warning, author) => ({
	embeds: [
		{
			title: `${constants.emojis.events.warned} Member warned`,
			color: constants.colours.warning,
			description: `${client.diagnostics.member(member)} has been warned by ${client.diagnostics.user(author)} for: ${
				warning.reason
			}`,
		},
	],
});

export default logger;
