import constants from "../../../../constants/constants";
import diagnostics from "../../../../diagnostics";
import { ClientEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.user.unbanned} User unbanned`,
	message: (_, user, __) => `${diagnostics.display.user(user)} has been unbanned.`,
	filter: (_, originGuildId, user, guildId) => originGuildId === guildId && !user.toggles?.has("bot"),
	color: constants.colors.dullYellow,
} satisfies MessageGenerators<ClientEvents>["guildBanRemove"] as MessageGenerators<ClientEvents>["guildBanRemove"];
