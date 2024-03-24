import diagnostics from "logos:core/diagnostics";
import { Client } from "logos/client";
import { EventLogger } from "logos/journalling/logger";

class SlowmodeDisableEventLogger extends EventLogger<"slowmodeDisable"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.slowmode.disabled} Slowmode disabled`,
			colour: constants.colours.dullYellow,
		});
	}

	filter(originGuildId: bigint, _: Logos.User, channel: Logos.Channel): boolean {
		return originGuildId === channel.guildId;
	}

	buildMessage(user: Logos.User, channel: Logos.Channel): string {
		return `${diagnostics.display.user(user)} has disabled slowmode in ${diagnostics.display.channel(channel)}.`;
	}
}

export { SlowmodeDisableEventLogger };
