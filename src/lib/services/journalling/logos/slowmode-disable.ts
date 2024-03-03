import diagnostics from "../../../../diagnostics";
import { Client } from "../../../client";
import { EventLogger } from "../logger";

class SlowmodeDisableEventLogger extends EventLogger<"slowmodeDisable"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.symbols.events.slowmode.disabled} Slowmode disabled`,
			colour: constants.colors.dullYellow,
		});
	}

	filter(originGuildId: bigint, _: Logos.User, channel: Logos.Channel): boolean {
		return originGuildId === channel.guildId;
	}

	message(user: Logos.User, channel: Logos.Channel): string {
		return `${diagnostics.display.user(user)} has disabled slowmode in ${diagnostics.display.channel(channel)}.`;
	}
}

export { SlowmodeDisableEventLogger };
