import * as Discord from "@discordeno/bot";
import { CommandTemplate } from "../../command";
import language from "./settings/language";
import view from "./settings/view";

const command: CommandTemplate = {
	name: "settings",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [language, view],
};

export default command;
