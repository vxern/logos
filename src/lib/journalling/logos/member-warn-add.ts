import { Client } from "logos/client";
import { Warning } from "logos/database/warning";
import { EventLogger } from "logos/journalling/logger";

class MemberWarnAddEventLogger extends EventLogger<"memberWarnAdd"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.warned} Member warned`,
			colour: constants.colours.dullYellow,
		});
	}

	filter(originGuildId: bigint, member: Logos.Member, _: Warning, __: Logos.User): boolean {
		return originGuildId === member.guildId;
	}

	buildMessage(member: Logos.Member, warning: Warning, by: Logos.User): string | undefined {
		const memberUser = this.client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return undefined;
		}

		return `${this.client.diagnostics.user(memberUser)} has been warned by ${this.client.diagnostics.user(by)} for: ${
			warning.reason
		}`;
	}
}

export { MemberWarnAddEventLogger };
