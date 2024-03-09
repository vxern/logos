import diagnostics from "../../../diagnostics";
import { Client } from "../../client";
import { EventLogger } from "../logger";

class MemberTimeoutRemoveEventLogger extends EventLogger<"memberTimeoutRemove"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.timeout.removed} Member's timeout cleared`,
			colour: constants.colors.blue,
		});
	}

	filter(originGuildId: bigint, member: Logos.Member, _: Logos.User): boolean {
		return originGuildId === member.guildId;
	}

	buildMessage(member: Logos.Member, by: Logos.User): string | undefined {
		const memberUser = this.client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return undefined;
		}

		return `The timeout of ${diagnostics.display.user(memberUser)} has been cleared by: ${diagnostics.display.user(
			by,
		)}`;
	}
}

export { MemberTimeoutRemoveEventLogger };
