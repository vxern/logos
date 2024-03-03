import diagnostics from "../../../diagnostics";
import { Client } from "../../client";
import { EventLogger } from "../logger";

class EntryRequestAcceptEventLogger extends EventLogger<"entryRequestAccept"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.symbols.events.entryRequest.accepted} Entry request accepted`,
			colour: constants.colors.lightGreen,
		});
	}

	filter(originGuildId: bigint, _: Logos.User, by: Logos.Member): boolean {
		return originGuildId === by.guildId;
	}

	message(user: Logos.User, by: Logos.Member): string | undefined {
		const byUser = this.client.entities.users.get(by.id);
		if (byUser === undefined) {
			return;
		}

		return `${diagnostics.display.user(user)}'s entry request has been accepted by ${diagnostics.display.user(byUser)}`;
	}
}

export { EntryRequestAcceptEventLogger };
