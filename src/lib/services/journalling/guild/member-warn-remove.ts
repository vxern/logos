import constants from "../../../../constants/constants";
import diagnostics from "../../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.pardoned} Member pardoned`,
	message: (client, member, warning, by) => {
		const memberUser = client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		return `${diagnostics.display.user(memberUser)} has been pardoned by ${diagnostics.display.user(
			by,
		)} regarding their warning for: ${warning.reason}`;
	},
	filter: (_, originGuildId, member, __, ___) => originGuildId === member.guildId,
	color: constants.colors.blue,
} satisfies MessageGenerators<GuildEvents>["memberWarnRemove"];
