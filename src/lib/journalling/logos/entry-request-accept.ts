import { Client } from "logos/client";
import { EventLogger } from "logos/journalling/logger";

class EntryRequestAcceptEventLogger extends EventLogger<"entryRequestAccept"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.entryRequest.accepted} Entry request accepted`,
			colour: constants.colours.lightGreen,
		});
	}

	filter(originGuildId: bigint, _: Logos.User, by: Logos.Member): boolean {
		return originGuildId === by.guildId;
	}

	buildMessage(user: Logos.User, by: Logos.Member): string | undefined {
		const byUser = this.client.entities.users.get(by.id);
		if (byUser === undefined) {
			return;
		}

		return `${this.client.diagnostics.user(user)}'s entry request has been accepted by ${this.client.diagnostics.user(
			byUser,
		)}`;
	}
}

export { EntryRequestAcceptEventLogger };
