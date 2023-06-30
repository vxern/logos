import constants from "../../../../constants";
import { diagnosticMentionUser } from "../../../utils";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.pardoned} Member pardoned`,
	message: (client, member, warning, by) => {
		const memberUser = client.cache.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		return `${diagnosticMentionUser(memberUser)} has been pardoned by ${diagnosticMentionUser(
			by,
		)} regarding their warning for: ${warning.reason}`;
	},
	filter: (_, originGuildId, member, __, ___) => originGuildId === member.guildId,
	color: constants.colors.blue,
} satisfies MessageGenerators<GuildEvents>["memberWarnRemove"];
