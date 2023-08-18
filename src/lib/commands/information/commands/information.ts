import { CommandTemplate } from "../../command";
import { handleDisplayBotInformation } from "./information/bot";
import { handleDisplayGuildInformation } from "./information/guild";
import * as Discord from "@discordeno/bot";

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
