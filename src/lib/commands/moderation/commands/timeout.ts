import * as Discord from "@discordeno/bot";
import { CommandTemplate } from "../../command";
import { duration, reason, user } from "../../parameters";
import { handleClearTimeout, handleClearTimeoutAutocomplete } from "./timeout/clear";
import { handleSetTimeout, handleSetTimeoutAutocomplete } from "./timeout/set";

const command: CommandTemplate = {
	id: "timeout",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	options: [
		{
			id: "set",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleSetTimeout,
			handleAutocomplete: handleSetTimeoutAutocomplete,
			options: [user, duration, reason],
		},
		{
			id: "clear",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleClearTimeout,
			handleAutocomplete: handleClearTimeoutAutocomplete,
			options: [user],
		},
	],
};

export default command;
