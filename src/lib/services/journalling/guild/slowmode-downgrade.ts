import constants from "../../../../constants/constants";
import diagnostics from "../../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.slowmode.downgraded} Slowmode level downgraded`,
	message: (_, user, channel, previousLevel, currentLevel) => {
		return `${diagnostics.display.user(user)} has downgraded the slowmode level in ${diagnostics.display.channel(
			channel,
		)} from "${previousLevel}" to "${currentLevel}".`;
	},
	filter: (_, originGuildId, __, channel, ___, ____) => originGuildId === channel.guildId,
	color: constants.colors.dullYellow,
} satisfies MessageGenerators<GuildEvents>["slowmodeDowngrade"];
