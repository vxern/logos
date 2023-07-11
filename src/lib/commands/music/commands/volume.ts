import { OptionTemplate } from "../../command.js";
import { show } from "../../parameters.js";
import { handleDisplayVolume } from "./volume/display.js";
import { handleSetVolume } from "./volume/set.js";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "volume",
	type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
	options: [
		{
			name: "display",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleDisplayVolume,
			options: [show],
		},
		{
			name: "set",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleSetVolume,
			options: [
				{
					name: "volume",
					type: Discord.ApplicationCommandOptionTypes.Integer,
					required: true,
				},
			],
		},
	],
};

export default command;
