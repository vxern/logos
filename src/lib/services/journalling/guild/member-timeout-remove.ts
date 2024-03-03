import constants from "../../../../constants/constants";
import diagnostics from "../../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.timeout.removed} Member's timeout cleared`,
	message: (client, member, by) => {
		const memberUser = client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		return `The timeout of ${diagnostics.display.user(memberUser)} has been cleared by: ${diagnostics.display.user(
			by,
		)}`;
	},
	filter: (_, originGuildId, member, __) => originGuildId === member.guildId,
	color: constants.colors.blue,
} satisfies MessageGenerators<GuildEvents>["memberTimeoutRemove"];
