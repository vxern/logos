import * as Discord from "@discordeno/bot";
import { OptionTemplate } from "../../command";
import { show } from "../../parameters";
import { handleDisplayVolume } from "./volume/display";
import { handleSetVolume } from "./volume/set";

const command: OptionTemplate = {
	id: "volume",
	type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
	options: [
		{
			id: "display",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleDisplayVolume,
			options: [show],
			flags: {
				isShowable: true,
			},
		},
		{
			id: "set",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleSetVolume,
			options: [
				{
					id: "volume",
					type: Discord.ApplicationCommandOptionTypes.Integer,
					required: true,
				},
			],
		},
	],
};

export default command;
