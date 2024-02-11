import constants from "../../../../constants/constants";
import diagnostics from "../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.suggestion} Suggestion made`,
	message: (client, member, suggestion) => {
		const memberUser = client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		return `${diagnostics.display.user(memberUser)} has made a suggestion.\n\nSuggestion: *${
			suggestion.answers.suggestion
		}*`;
	},
	filter: (_, originGuildId, member, __) => originGuildId === member.guildId,
	color: constants.colors.darkGreen,
} satisfies MessageGenerators<GuildEvents>["suggestionSend"];
