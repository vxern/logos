import constants from "../../../../constants";
import { diagnosticMentionUser } from "../../../utils";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.praised} Member praised`,
	message: (client, member, praise, by) => {
		const memberUser = client.cache.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		const comment = praise.comment ?? "None.";

		return `${diagnosticMentionUser(memberUser)} has been praised by ${diagnosticMentionUser(by)}. Comment: ${comment}`;
	},
	filter: (_client, originGuildId, member, _praise, _by) => originGuildId === member.guildId,
	color: constants.colors.lightGreen,
} satisfies MessageGenerators<GuildEvents>["praiseAdd"];
