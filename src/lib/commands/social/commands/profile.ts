import * as Discord from "@discordeno/bot";
import { CommandTemplate } from "../../command";
import roles from "./profile/roles";
import view from "./profile/view";

const command: CommandTemplate = {
	id: "profile",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [view, roles],
};

export default command;
