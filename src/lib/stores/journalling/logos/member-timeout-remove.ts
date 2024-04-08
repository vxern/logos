import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"memberTimeoutRemove"> = async (client, member, author) => ({
	embeds: [
		{
			title: `${constants.emojis.events.timeout.removed} Member's timeout cleared`,
			color: constants.colours.notice,
			description: `The timeout of ${client.diagnostics.member(member)} has been cleared by: ${client.diagnostics.user(
				author,
			)}`,
		},
	],
});

export default logger;
