import constants from "../../../../constants/constants";
import { timestamp } from "../../../../formatting";
import diagnostics from "../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.timeout.added} Member timed out`,
	message: (client, member, until, reason, by) => {
		const memberUser = client.cache.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		return `${diagnostics.display.user(memberUser)} has been timed out by ${diagnostics.display.user(
			by,
		)} until ${timestamp(until)} for: ${reason}`;
	},
	filter: (_, originGuildId, member, __, ___, ____) => originGuildId === member.guildId,
	color: constants.colors.dullYellow,
} satisfies MessageGenerators<GuildEvents>["memberTimeoutAdd"];
