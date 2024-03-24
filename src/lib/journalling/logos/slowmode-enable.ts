import { SlowmodeLevel } from "logos:constants/slowmode";
import diagnostics from "logos:core/diagnostics";
import { Client } from "logos/client";
import { EventLogger } from "logos/journalling/logger";

class SlowmodeEnableEventLogger extends EventLogger<"slowmodeEnable"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.slowmode.enabled} Slowmode enabled`,
			colour: constants.colours.dullYellow,
		});
	}

	filter(originGuildId: bigint, _: Logos.User, channel: Logos.Channel, __: SlowmodeLevel): boolean {
		return originGuildId === channel.guildId;
	}

	buildMessage(user: Logos.User, channel: Logos.Channel, level: SlowmodeLevel): string {
		return `${diagnostics.display.user(user)} has enabled slowmode in ${diagnostics.display.channel(
			channel,
		)} with level "${level}".`;
	}
}

export { SlowmodeEnableEventLogger };
