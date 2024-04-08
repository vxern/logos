import { timestamp } from "logos:core/formatting";
import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"memberTimeoutAdd"> = async (client, member, until, reason, author) => ({
	embeds: [
		{
			title: `${constants.emojis.events.timeout.added} Member timed out`,
			color: constants.colours.warning,
			description: `${client.diagnostics.member(member)} has been timed out by ${client.diagnostics.user(
				author,
			)} until ${timestamp(until, { format: "relative" })} for: ${reason}`,
		},
	],
});

export default logger;
