import constants from "../../../../constants/constants";
import diagnostics from "../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.praised} Member praised`,
	message: (client, member, praise, by) => {
		const memberUser = client.cache.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		const comment = praise.comment ?? "None.";

		return `${diagnostics.display.user(memberUser)} has been praised by ${diagnostics.display.user(
			by,
		)}. Comment: ${comment}`;
	},
	filter: (_, originGuildId, member, __, ___) => originGuildId === member.guildId,
	color: constants.colors.lightGreen,
} satisfies MessageGenerators<GuildEvents>["praiseAdd"];
