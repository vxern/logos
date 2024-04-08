import { SlowmodeLevel } from "logos:constants/slowmode";
import { Client } from "logos/client";
import { EventLogger } from "logos/stores/journalling/logger";

class SlowmodeEnableEventLogger extends EventLogger<"slowmodeEnable"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.slowmode.enabled} Slowmode enabled`,
			colour: constants.colours.dullYellow,
		});
	}

	buildMessage(user: Logos.User, channel: Logos.Channel, level: SlowmodeLevel): string {
		return `${this.client.diagnostics.user(user)} has enabled slowmode in ${this.client.diagnostics.channel(
			channel,
		)} with level "${level}".`;
	}
}

export { SlowmodeEnableEventLogger };
