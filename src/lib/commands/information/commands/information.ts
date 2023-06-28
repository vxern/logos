import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "discordeno";
import { handleDisplayBotInformation } from "./information/bot.js";
import { handleDisplayGuildInformation } from "./information/guild.js";
import { CommandTemplate } from "../../command.js";

const command: CommandTemplate = {
	name: "information",
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [
		{
			name: "bot",
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleDisplayBotInformation,
		},
		{
			name: "server",
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleDisplayGuildInformation,
		},
	],
};

export default command;
