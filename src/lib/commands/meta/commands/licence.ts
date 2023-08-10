import { CommandTemplate } from "../../command";
import dictionary from "./licences/dictionary";
import software from "./licences/software";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "license",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [dictionary, software],
};

export default command;
