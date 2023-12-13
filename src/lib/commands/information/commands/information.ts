import * as Discord from "@discordeno/bot";
import { CommandTemplate } from "../../command";
import bot from "./information/bot";
import guild from "./information/guild";

const command: CommandTemplate = {
	name: "information",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [bot, guild],
};

export default command;
