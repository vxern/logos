import diagnostics from "../../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.slowmode.upgraded} Slowmode level upgraded`,
	message: (_, user, channel, previousLevel, currentLevel) => {
		return `${diagnostics.display.user(user)} has upgraded the slowmode level in ${diagnostics.display.channel(
			channel,
		)} from "${previousLevel}" to "${currentLevel}".`;
	},
	filter: (_, originGuildId, __, channel, ___, ____) => originGuildId === channel.guildId,
	color: constants.colors.dullYellow,
} satisfies MessageGenerators<GuildEvents>["slowmodeUpgrade"];
