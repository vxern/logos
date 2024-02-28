import { CommandTemplate } from "../../command";
import dictionary from "./licences/dictionary";
import software from "./licences/software";

const command: CommandTemplate = {
	id: "license",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [dictionary, software],
};

export default command;
