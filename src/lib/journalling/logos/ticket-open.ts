import diagnostics from "../../../diagnostics";
import { Client } from "../../client";
import { Ticket } from "../../database/ticket";
import { EventLogger } from "../logger";

class TicketOpenEventLogger extends EventLogger<"ticketOpen"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.ticket} Ticket opened`,
			colour: constants.colours.husky,
		});
	}

	filter(originGuildId: bigint, member: Logos.Member, _: Ticket): boolean {
		return originGuildId === member.guildId;
	}

	buildMessage(member: Logos.Member, ticket: Ticket): string | undefined {
		const memberUser = this.client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return undefined;
		}

		return `${diagnostics.display.user(memberUser)} has opened a ticket.\n\nTopic: *${ticket.answers.topic}*`;
	}
}

export { TicketOpenEventLogger };