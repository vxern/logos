import * as Discord from "@discordeno/bot";
import { CommandTemplate } from "../../command";
import edit from "./article/edit";
import submit from "./article/submit";
import view from "./article/view";

const command: CommandTemplate = {
	name: "article",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [submit, edit, view],
};

export default command;
