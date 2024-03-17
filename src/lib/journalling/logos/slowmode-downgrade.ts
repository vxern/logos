import { SlowmodeLevel } from "../../../constants/slowmode";
import diagnostics from "../../../diagnostics";
import { Client } from "../../client";
import { EventLogger } from "../logger";

class SlowmodeDowngradeEventLogger extends EventLogger<"slowmodeDowngrade"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.slowmode.downgraded} Slowmode level downgraded`,
			colour: constants.colours.dullYellow,
		});
	}

	filter(originGuildId: bigint, _: Logos.User, channel: Logos.Channel, __: SlowmodeLevel, ___: SlowmodeLevel): boolean {
		return originGuildId === channel.guildId;
	}

	buildMessage(
		user: Logos.User,
		channel: Logos.Channel,
		previousLevel: SlowmodeLevel,
		currentLevel: SlowmodeLevel,
	): string {
		return `${diagnostics.display.user(user)} has downgraded the slowmode level in ${diagnostics.display.channel(
			channel,
		)} from "${previousLevel}" to "${currentLevel}".`;
	}
}

export { SlowmodeDowngradeEventLogger };
