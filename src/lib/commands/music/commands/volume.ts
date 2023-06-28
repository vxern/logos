import { ApplicationCommandOptionTypes } from "discordeno";
import { handleDisplayVolume } from "./volume/display.js";
import { handleSetVolume } from "./volume/set.js";
import { OptionTemplate } from "../../command.js";
import { show } from "../../parameters.js";

const command: OptionTemplate = {
	name: "volume",
	type: ApplicationCommandOptionTypes.SubCommandGroup,
	options: [
		{
			name: "display",
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleDisplayVolume,
			options: [show],
		},
		{
			name: "set",
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleSetVolume,
			options: [
				{
					name: "volume",
					type: ApplicationCommandOptionTypes.Integer,
					required: true,
				},
			],
		},
	],
};

export default command;
