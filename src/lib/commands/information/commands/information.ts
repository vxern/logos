import { CommandTemplate } from "../../command.js";
import { handleDisplayBotInformation } from "./information/bot.js";
import { handleDisplayGuildInformation } from "./information/guild.js";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "information",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [
		{
			name: "bot",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleDisplayBotInformation,
		},
		{
			name: "server",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleDisplayGuildInformation,
		},
	],
};

export default command;
