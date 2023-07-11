import constants from "../../../../constants";
import { diagnosticMentionUser } from "../../../utils";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.entryRequest.rejected} Entry request rejected`,
	message: (client, user, by) => {
		const byUser = client.cache.users.get(by.id);
		if (byUser === undefined) {
			return;
		}

		return `${diagnosticMentionUser(user)}'s entry request has been rejected by ${diagnosticMentionUser(byUser)}`;
	},
	filter: (_, originGuildId, __, by) => originGuildId === by.guildId,
	color: constants.colors.red,
} satisfies MessageGenerators<GuildEvents>["entryRequestReject"];
