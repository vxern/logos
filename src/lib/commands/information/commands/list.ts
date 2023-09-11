import * as Discord from "@discordeno/bot";
import { CommandTemplate } from "../../command";
import { user } from "../../parameters";
import { handleDisplayWarnings, handleDisplayWarningsAutocomplete } from "./list/warnings";

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
