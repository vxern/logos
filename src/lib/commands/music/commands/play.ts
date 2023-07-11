import { OptionTemplate } from "../../command.js";
import { query } from "../../parameters.js";
import { sources } from "../data/sources/sources.js";
import { handleRequestFilePlayback } from "./play/file.js";
import { handleRequestQueryPlayback } from "./play/query.js";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "play",
	type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
	options: [
		{
			name: "file",
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: handleRequestFilePlayback,
			options: [
				{
					name: "url",
					type: Discord.ApplicationCommandOptionTypes.String,
					required: true,
				},
			],
		},
		...Object.entries(sources).map<OptionTemplate>(([name, resolve]) => ({
			name: name.toLowerCase(),
			type: Discord.ApplicationCommandOptionTypes.SubCommand,
			handle: async ([client, bot], interaction) => handleRequestQueryPlayback([client, bot], interaction, resolve),
			options: [query],
		})),
	],
};

export default command;
