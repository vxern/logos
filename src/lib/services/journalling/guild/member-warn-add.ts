import diagnostics from "../../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.warned} Member warned`,
	message: (client, member, warning, by) => {
		const memberUser = client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		return `${diagnostics.display.user(memberUser)} has been warned by ${diagnostics.display.user(by)} for: ${
			warning.reason
		}`;
	},
	filter: (_, originGuildId, member, __, ___) => originGuildId === member.guildId,
	color: constants.colors.dullYellow,
} satisfies MessageGenerators<GuildEvents>["memberWarnAdd"];
