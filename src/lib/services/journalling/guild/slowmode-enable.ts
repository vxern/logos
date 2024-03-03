import constants from "../../../../constants/constants";
import diagnostics from "../../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.slowmode.enabled} Slowmode enabled`,
	message: (_, user, channel, level) => {
		return `${diagnostics.display.user(user)} has enabled slowmode in ${diagnostics.display.channel(
			channel,
		)} with level "${level}".`;
	},
	filter: (_, originGuildId, __, channel, ___) => originGuildId === channel.guildId,
	color: constants.colors.dullYellow,
} satisfies MessageGenerators<GuildEvents>["slowmodeEnable"];
