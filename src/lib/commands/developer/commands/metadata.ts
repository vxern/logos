import { CommandTemplate } from "../../command.js";
import { handleResetLanguage } from "./metadata/language/reset.js";
import { handleSetLanguage } from "./metadata/language/set.js";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "metadata",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["ADMINISTRATOR"],
	options: [
		{
			name: "language",
			type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
			options: [
				{
					name: "set",
					type: Discord.ApplicationCommandOptionTypes.SubCommand,
					handle: handleSetLanguage,
					options: [
						{
							name: "language",
							type: Discord.ApplicationCommandOptionTypes.String,
							required: true,
						},
					],
				},
				{
					name: "reset",
					type: Discord.ApplicationCommandOptionTypes.SubCommand,
					handle: handleResetLanguage,
				},
			],
		},
	],
};

export default command;
