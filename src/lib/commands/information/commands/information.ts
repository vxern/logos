import { CommandTemplate } from "../../command.js";
import { handleDisplayBotInformation } from "./information/bot.js";
import { handleDisplayGuildInformation } from "./information/guild.js";
import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "discordeno";

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
