import * as Discord from "@discordeno/bot";
import { CommandTemplate } from "../../command";
import open from "./ticket/open";

const command: CommandTemplate = {
	id: "ticket",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [open],
};

export default command;
