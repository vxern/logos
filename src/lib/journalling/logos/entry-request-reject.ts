import diagnostics from "../../../diagnostics";
import { Client } from "../../client";
import { EventLogger } from "../logger";

class EntryRequestRejectEventLogger extends EventLogger<"entryRequestReject"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.entryRequest.rejected} Entry request rejected`,
			colour: constants.colours.red,
		});
	}

	filter(originGuildId: bigint, _: Logos.User, by: Logos.Member): boolean {
		return originGuildId === by.guildId;
	}

	buildMessage(user: Logos.User, by: Logos.Member): string | undefined {
		const byUser = this.client.entities.users.get(by.id);
		if (byUser === undefined) {
			return undefined;
		}

		return `${diagnostics.display.user(user)}'s entry request has been rejected by ${diagnostics.display.user(byUser)}`;
	}
}

export { EntryRequestRejectEventLogger };