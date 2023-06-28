import { ApplicationCommandTypes } from "discordeno";
import roles from "./profile/roles.js";
import view from "./profile/view.js";
import { CommandTemplate } from "../../command.js";

const command: CommandTemplate = {
	name: "profile",
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [view, roles],
};

export default command;
