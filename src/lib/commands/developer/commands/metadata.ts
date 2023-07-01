import { CommandTemplate } from "../../command.js";
import { handleResetLanguage } from "./metadata/language/reset.js";
import { handleSetLanguage } from "./metadata/language/set.js";
import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "discordeno";

const command: CommandTemplate = {
	name: "metadata",
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["ADMINISTRATOR"],
	options: [
		{
			name: "language",
			type: ApplicationCommandOptionTypes.SubCommandGroup,
			options: [
				{
					name: "set",
					type: ApplicationCommandOptionTypes.SubCommand,
					handle: handleSetLanguage,
					options: [
						{
							name: "language",
							type: ApplicationCommandOptionTypes.String,
							required: true,
						},
					],
				},
				{
					name: "reset",
					type: ApplicationCommandOptionTypes.SubCommand,
					handle: handleResetLanguage,
				},
			],
		},
	],
};

export default command;
