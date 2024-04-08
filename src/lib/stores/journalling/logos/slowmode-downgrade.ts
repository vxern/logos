import { SlowmodeLevel } from "logos:constants/slowmode";
import { Client } from "logos/client";
import { EventLogger } from "logos/stores/journalling/logger";

class SlowmodeDowngradeEventLogger extends EventLogger<"slowmodeDowngrade"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.slowmode.downgraded} Slowmode level downgraded`,
			colour: constants.colours.dullYellow,
		});
	}

	buildMessage(
		user: Logos.User,
		channel: Logos.Channel,
		previousLevel: SlowmodeLevel,
		currentLevel: SlowmodeLevel,
	): string {
		return `${this.client.diagnostics.user(
			user,
		)} has downgraded the slowmode level in ${this.client.diagnostics.channel(
			channel,
		)} from "${previousLevel}" to "${currentLevel}".`;
	}
}

export { SlowmodeDowngradeEventLogger };
