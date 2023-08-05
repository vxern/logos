import constants from "../../../../constants/constants";
import diagnostics from "../../../diagnostics";
import { ClientEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.user.joined} User joined`,
	message: (_, __, ___, user) => `${diagnostics.display.user(user)} has joined the server.`,
	filter: (_, originGuildId, __, member, user) => originGuildId === member.guildId && !user.toggles.bot,
	color: constants.colors.lightGreen,
} satisfies MessageGenerators<ClientEvents>["guildMemberAdd"];
