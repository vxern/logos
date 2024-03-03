import diagnostics from "../../../../diagnostics";
import { ClientEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.user.banned} User banned`,
	message: (_, user, __) => `${diagnostics.display.user(user)} has been banned.`,
	filter: (_, originGuildId, user, guildId) => originGuildId === guildId && !user.toggles?.has("bot"),
	color: constants.colors.red,
} satisfies MessageGenerators<ClientEvents>["guildBanAdd"] as MessageGenerators<ClientEvents>["guildBanAdd"];
