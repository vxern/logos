import { Client } from "logos/client";
import { EventLogger } from "logos/journalling/logger";

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

		return `${this.client.diagnostics.user(user)}'s entry request has been rejected by ${this.client.diagnostics.user(
			byUser,
		)}`;
	}
}

export { EntryRequestRejectEventLogger };
