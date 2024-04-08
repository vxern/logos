import { Client } from "logos/client";
import { Warning } from "logos/database/warning";
import { EventLogger } from "logos/stores/journalling/logger";

class MemberWarnRemoveEventLogger extends EventLogger<"memberWarnRemove"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.pardoned} Member pardoned`,
			colour: constants.colours.blue,
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

		return `${this.client.diagnostics.user(memberUser)} has been pardoned by ${this.client.diagnostics.user(
			by,
		)} regarding their warning for: ${warning.reason}`;
	}
}

export { MemberWarnRemoveEventLogger };
