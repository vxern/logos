import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"ticketOpen"> = async (client, member, ticket) => ({
	embeds: [
		{
			title: `${constants.emojis.events.ticket} Ticket opened`,
			color: constants.colours.notice,
			description: `${client.diagnostics.member(member)} has opened a ticket.\n\nTopic: *${ticket.formData.topic}*`,
		},
	],
});

export default logger;
