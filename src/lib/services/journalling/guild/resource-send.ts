import constants from "../../../../constants/constants";
import diagnostics from "../../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.resource} Resource submitted`,
	message: (client, member, resource) => {
		const memberUser = client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return;
		}

		return `${diagnostics.display.user(memberUser)} has submitted a resource.\n\nResource: *${
			resource.answers.resource
		}*`;
	},
	filter: (_, originGuildId, member, __) => originGuildId === member.guildId,
	color: constants.colors.darkGreen,
} satisfies MessageGenerators<GuildEvents>["resourceSend"];
