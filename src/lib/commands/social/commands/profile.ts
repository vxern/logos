import { CommandTemplate } from "../../command";
import roles from "./profile/roles";
import view from "./profile/view";
import * as Discord from "@discordeno/bot";

const command: CommandTemplate = {
	name: "profile",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [view, roles],
};

export default command;
