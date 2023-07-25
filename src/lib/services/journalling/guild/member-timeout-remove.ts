import constants from "../../../../constants/constants";
import { diagnosticMentionUser } from "../../../utils";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.timeout.removed} Member's timeout cleared`,
	message: (client, member, by) => {
		const memberUser = client.cache.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		return `The timeout of ${diagnosticMentionUser(memberUser)} has been cleared by: ${diagnosticMentionUser(by)}`;
	},
	filter: (_, originGuildId, member, __) => originGuildId === member.guildId,
	color: constants.colors.blue,
} satisfies MessageGenerators<GuildEvents>["memberTimeoutRemove"];
