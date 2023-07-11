import { CommandTemplate } from "../../command.js";
import { user } from "../../parameters.js";
import { handleDisplayWarnings, handleDisplayWarningsAutocomplete } from "./list/warnings.js";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "list",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [
		{
			name: "warnings",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleDisplayWarnings,
			handleAutocomplete: handleDisplayWarningsAutocomplete,
			options: [{ ...user, required: false }],
		},
	],
};

export default command;
