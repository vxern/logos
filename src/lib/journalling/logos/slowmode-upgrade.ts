import diagnostics from "../../../diagnostics";
import { Client } from "../../client";
import { SlowmodeLevel } from "../../commands/moderation/commands/slowmode";
import { EventLogger } from "../logger";

class SlowmodeUpgradeEventLogger extends EventLogger<"slowmodeUpgrade"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.slowmode.upgraded} Slowmode level upgraded`,
			colour: constants.colors.dullYellow,
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
