import { CommandTemplate } from "../../command";
import { duration, reason, user } from "../../parameters";
import { handleClearTimeout, handleClearTimeoutAutocomplete } from "./timeout/clear";
import { handleSetTimeout, handleSetTimeoutAutocomplete } from "./timeout/set";
import * as Discord from "@discordeno/bot";

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
