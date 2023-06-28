import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "discordeno";
import { handleSetTimeout, handleSetTimeoutAutocomplete } from "./timeout/set.js";
import { handleClearTimeout, handleClearTimeoutAutocomplete } from "./timeout/clear.js";
import { CommandTemplate } from "../../command.js";
import { duration, reason, user } from "../../parameters.js";

const command: CommandTemplate = {
	name: "timeout",
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	options: [
		{
			name: "set",
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleSetTimeout,
			handleAutocomplete: handleSetTimeoutAutocomplete,
			options: [user, duration, reason],
		},
		{
			name: "clear",
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleClearTimeout,
			handleAutocomplete: handleClearTimeoutAutocomplete,
			options: [user],
		},
	],
};

export default command;
