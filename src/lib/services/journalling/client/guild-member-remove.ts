import constants from "../../../../constants/constants";
import { diagnosticMentionUser } from "../../../utils";
import { ClientEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.user.left} User left`,
	message: (_, __, user, ___) => `${diagnosticMentionUser(user)} has left the server.`,
	filter: (_, originGuildId, __, user, guildId) => originGuildId === guildId && !user.toggles.bot,
	color: constants.colors.dullYellow,
} satisfies MessageGenerators<ClientEvents>["guildMemberRemove"];
