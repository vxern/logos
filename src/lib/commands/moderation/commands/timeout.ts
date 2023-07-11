import { CommandTemplate } from "../../command.js";
import { duration, reason, user } from "../../parameters.js";
import { handleClearTimeout, handleClearTimeoutAutocomplete } from "./timeout/clear.js";
import { handleSetTimeout, handleSetTimeoutAutocomplete } from "./timeout/set.js";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "timeout",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	options: [
		{
			name: "set",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleSetTimeout,
			handleAutocomplete: handleSetTimeoutAutocomplete,
			options: [user, duration, reason],
		},
		{
			name: "clear",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleClearTimeout,
			handleAutocomplete: handleClearTimeoutAutocomplete,
			options: [user],
		},
	],
};

export default command;
