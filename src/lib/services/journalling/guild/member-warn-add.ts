import constants from "../../../../constants";
import { diagnosticMentionUser } from "../../../utils";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.warned} Member warned`,
	message: (client, member, warning, by) => {
		const memberUser = client.cache.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		return `${diagnosticMentionUser(memberUser)} has been warned by ${diagnosticMentionUser(by)} for: ${
			warning.reason
		}`;
	},
	filter: (_, originGuildId, member, __, ___) => originGuildId === member.guildId,
	color: constants.colors.dullYellow,
} satisfies MessageGenerators<GuildEvents>["memberWarnAdd"];
