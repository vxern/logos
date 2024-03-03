import constants from "../../../../constants/constants";
import diagnostics from "../../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.slowmode.disabled} Slowmode disabled`,
	message: (_, user, channel) => {
		return `${diagnostics.display.user(user)} has disabled slowmode in ${diagnostics.display.channel(channel)}.`;
	},
	filter: (_, originGuildId, __, channel) => originGuildId === channel.guildId,
	color: constants.colors.dullYellow,
} satisfies MessageGenerators<GuildEvents>["slowmodeDisable"];
