import constants from "../../../../constants/constants";
import diagnostics from "../../../../diagnostics";
import { ClientEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.user.joined} User joined`,
	message: (_, __, user) => `${diagnostics.display.user(user)} has joined the server.`,
	filter: (_, originGuildId, member, user) => originGuildId === member.guildId && !user.toggles?.has("bot"),
	color: constants.colors.lightGreen,
} satisfies MessageGenerators<ClientEvents>["guildMemberAdd"];
