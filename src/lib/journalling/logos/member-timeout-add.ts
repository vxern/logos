import diagnostics from "logos:core/diagnostics";
import { timestamp } from "logos:core/formatting";
import { Client } from "logos/client";
import { EventLogger } from "logos/journalling/logger";

class MemberTimeoutAddEventLogger extends EventLogger<"memberTimeoutAdd"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.timeout.added} Member timed out`,
			colour: constants.colours.dullYellow,
		});
	}

	filter(originGuildId: bigint, member: Logos.Member, _: number, __: string, ___: Logos.User): boolean {
		return originGuildId === member.guildId;
	}

	buildMessage(member: Logos.Member, until: number, reason: string, by: Logos.User): string | undefined {
		const memberUser = this.client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return undefined;
		}

		return `${diagnostics.display.user(memberUser)} has been timed out by ${diagnostics.display.user(
			by,
		)} until ${timestamp(until, { format: "relative" })} for: ${reason}`;
	}
}

export { MemberTimeoutAddEventLogger };
