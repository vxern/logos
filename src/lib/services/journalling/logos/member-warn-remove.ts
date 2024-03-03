import diagnostics from "../../../../diagnostics";
import { Client } from "../../../client";
import { Warning } from "../../../database/warning";
import { EventLogger } from "../logger";

class MemberWarnRemoveEventLogger extends EventLogger<"memberWarnRemove"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.symbols.events.pardoned} Member pardoned`,
			colour: constants.colors.blue,
		});
	}

	filter(originGuildId: bigint, member: Logos.Member, _: Warning, __: Logos.User): boolean {
		return originGuildId === member.guildId;
	}

	message(member: Logos.Member, warning: Warning, by: Logos.User): string | undefined {
		const memberUser = this.client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return undefined;
		}

		return `${diagnostics.display.user(memberUser)} has been pardoned by ${diagnostics.display.user(
			by,
		)} regarding their warning for: ${warning.reason}`;
	}
}

export { MemberWarnRemoveEventLogger };
