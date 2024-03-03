import constants from "../../../../constants/constants";
import diagnostics from "../../../../diagnostics";
import { ClientEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.user.left} User left`,
	message: (_, user, __) => `${diagnostics.display.user(user)} has left the server.`,
	filter: (_, originGuildId, user, guildId) => originGuildId === guildId && !user.toggles?.has("bot"),
	color: constants.colors.dullYellow,
} satisfies MessageGenerators<ClientEvents>["guildMemberRemove"];
