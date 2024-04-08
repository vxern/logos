import { Client } from "logos/client";
import { EventLogger } from "logos/stores/journalling/logger";

class SlowmodeDisableEventLogger extends EventLogger<"slowmodeDisable"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.slowmode.disabled} Slowmode disabled`,
			colour: constants.colours.dullYellow,
		});
	}

	buildMessage(user: Logos.User, channel: Logos.Channel): string {
		return `${this.client.diagnostics.user(user)} has disabled slowmode in ${this.client.diagnostics.channel(
			channel,
		)}.`;
	}
}

export { SlowmodeDisableEventLogger };
