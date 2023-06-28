import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "discordeno";
import { handleDisplayWarnings, handleDisplayWarningsAutocomplete } from "./list/warnings.js";
import { CommandTemplate } from "../../command.js";
import { user } from "../../parameters.js";

const command: CommandTemplate = {
	name: "list",
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [
		{
			name: "warnings",
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleDisplayWarnings,
			handleAutocomplete: handleDisplayWarningsAutocomplete,
			options: [{ ...user, required: false }],
		},
	],
};

export default command;
