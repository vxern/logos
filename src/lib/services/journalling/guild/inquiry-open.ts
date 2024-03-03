import constants from "../../../../constants/constants";
import diagnostics from "../../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.ticket} Ticket opened`,
	message: (client, member, topic) => {
		const memberUser = client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		return `${diagnostics.display.user(memberUser)} has opened a ticket.\n\nTopic: *${topic.answers.topic}*`;
	},
	filter: (_, originGuildId, member, __) => originGuildId === member.guildId,
	color: constants.colors.husky,
} satisfies MessageGenerators<GuildEvents>["ticketOpen"];
