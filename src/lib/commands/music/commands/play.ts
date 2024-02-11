import * as Discord from "@discordeno/bot";
import { OptionTemplate } from "../../command";
import { query } from "../../parameters";
import { sources } from "../data/sources/sources";
import { handleRequestFilePlayback } from "./play/file";
import { handleRequestQueryPlayback } from "./play/query";

const command: OptionTemplate = {
	id: "play",
	type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
	options: [
		{
			id: "file",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleRequestFilePlayback,
			options: [
				{
					id: "url",
					type: Discord.ApplicationCommandOptionTypes.String,
					required: true,
				},
			],
		},
		...Object.entries(sources).map<OptionTemplate>(([name, resolve]) => ({
			id: name.toLowerCase(),
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: async (client, interaction) => handleRequestQueryPlayback(client, interaction, resolve),
			options: [query],
		})),
	],
};

export default command;
