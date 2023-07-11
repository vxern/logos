import constants from "../../../../constants";
import { diagnosticMentionUser } from "../../../utils";
import { ClientEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.user.joined} User joined`,
	message: (_, __, ___, user) => `${diagnosticMentionUser(user)} has joined the server.`,
	filter: (_, originGuildId, __, member, user) => originGuildId === member.guildId && !user.toggles.bot,
	color: constants.colors.lightGreen,
} satisfies MessageGenerators<ClientEvents>["guildMemberAdd"];
