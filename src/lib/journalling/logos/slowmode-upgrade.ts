import { SlowmodeLevel } from "logos:constants/slowmode";
import diagnostics from "logos:core/diagnostics";
import { Client } from "logos/client";
import { EventLogger } from "logos/journalling/logger";

class SlowmodeUpgradeEventLogger extends EventLogger<"slowmodeUpgrade"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.slowmode.upgraded} Slowmode level upgraded`,
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
		return `${diagnostics.display.user(user)} has upgraded the slowmode level in ${diagnostics.display.channel(
			channel,
		)} from "${previousLevel}" to "${currentLevel}".`;
	}
}

export { SlowmodeUpgradeEventLogger };
