import constants from "../../../../constants";
import { diagnosticMentionUser } from "../../../utils";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.suggestion} Suggestion made`,
	message: (client, member, suggestion) => {
		const memberUser = client.cache.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		return `${diagnosticMentionUser(memberUser)} has made a suggestion.\n\nSuggestion: *${
			suggestion.answers.suggestion
		}*`;
	},
	filter: (_, originGuildId, member, __) => originGuildId === member.guildId,
	color: constants.colors.darkGreen,
} satisfies MessageGenerators<GuildEvents>["suggestionSend"];
