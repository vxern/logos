import constants from "../../../../constants";
import { diagnosticMentionUser } from "../../../utils";
import { ClientEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.user.unbanned} User unbanned`,
	message: (_, __, user, ___) => `${diagnosticMentionUser(user)} has been unbanned.`,
	filter: (_, originGuildId, __, user, guildId) => originGuildId === guildId && !user.toggles.bot,
	color: constants.colors.dullYellow,
} satisfies MessageGenerators<ClientEvents>["guildBanRemove"];
