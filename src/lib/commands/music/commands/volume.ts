import { OptionTemplate } from "../../command";
import { show } from "../../parameters";
import { handleDisplayVolume } from "./volume/display";
import { handleSetVolume } from "./volume/set";
import * as Discord from "@discordeno/bot";

const command: OptionTemplate = {
	name: "volume",
	type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
	options: [
		{
			name: "display",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			isShowable: true,
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
