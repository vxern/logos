import constants from "../../../../constants";
import { diagnosticMentionUser } from "../../../utils";
import { ClientEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.user.banned} User banned`,
	message: (_, __, user, ___) => `${diagnosticMentionUser(user)} has been banned.`,
	filter: (_, originGuildId, __, user, guildId) => originGuildId === guildId && !user.toggles.bot,
	color: constants.colors.red,
} satisfies MessageGenerators<ClientEvents>["guildBanAdd"];
