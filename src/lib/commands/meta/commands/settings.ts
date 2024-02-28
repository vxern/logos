import { CommandTemplate } from "../../command";
import language from "./settings/language";
import view from "./settings/view";

const command: CommandTemplate = {
	id: "settings",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [language, view],
};

export default command;
