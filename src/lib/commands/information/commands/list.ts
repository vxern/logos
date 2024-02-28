import { CommandTemplate } from "../../command";
import praises from "./list/praises";
import warnings from "./list/warnings";

const command: CommandTemplate = {
	id: "list",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [praises, warnings],
};

export default command;
