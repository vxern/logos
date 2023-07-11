import { CommandTemplate } from "../../command.js";
import roles from "./profile/roles.js";
import view from "./profile/view.js";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "profile",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [view, roles],
};

export default command;
