import diagnostics from "../../../diagnostics";
import { Client } from "../../client";
import { Praise } from "../../database/praise";
import { EventLogger } from "../logger";

class PraiseAddEventLogger extends EventLogger<"praiseAdd"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.praised} Member praised`,
			colour: constants.colours.lightGreen,
		});
	}

	filter(originGuildId: bigint, member: Logos.Member, _: Praise, __: Logos.User): boolean {
		return originGuildId === member.guildId;
	}

	buildMessage(member: Logos.Member, praise: Praise, by: Logos.User): string | undefined {
		const memberUser = this.client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return undefined;
		}

		const comment = praise.comment ?? "None.";

		return `${diagnostics.display.user(memberUser)} has been praised by ${diagnostics.display.user(
			by,
		)}. Comment: ${comment}`;
	}
}

export { PraiseAddEventLogger };
