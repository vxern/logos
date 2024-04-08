import { timestamp } from "logos:core/formatting";
import { Client } from "logos/client";
import { EventLogger } from "logos/stores/journalling/logger";

class MemberTimeoutAddEventLogger extends EventLogger<"memberTimeoutAdd"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.timeout.added} Member timed out`,
			colour: constants.colours.dullYellow,
		});
	}

	buildMessage(member: Logos.Member, until: number, reason: string, by: Logos.User): string | undefined {
		const memberUser = this.client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return undefined;
		}

		return `${this.client.diagnostics.user(memberUser)} has been timed out by ${this.client.diagnostics.user(
			by,
		)} until ${timestamp(until, { format: "relative" })} for: ${reason}`;
	}
}

export { MemberTimeoutAddEventLogger };
