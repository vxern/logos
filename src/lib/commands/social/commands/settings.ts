import { CommandTemplate } from "../../command";
import view from "./settings/view";
import language from "./settings/language";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "settings",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [language, view],
};

export default command;
