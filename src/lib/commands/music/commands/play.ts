import { ApplicationCommandOptionTypes } from "discordeno";
import { handleRequestFilePlayback } from "./play/file.js";
import { handleRequestQueryPlayback } from "./play/query.js";
import { sources } from "../data/sources/sources.js";
import { OptionTemplate } from "../../command.js";
import { query } from "../../parameters.js";

const command: OptionTemplate = {
	name: "play",
	type: ApplicationCommandOptionTypes.SubCommandGroup,
	options: [
		{
			name: "file",
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleRequestFilePlayback,
			options: [
				{
					name: "url",
					type: ApplicationCommandOptionTypes.String,
					required: true,
				},
			],
		},
		...Object.entries(sources).map<OptionTemplate>(([name, resolve]) => ({
			name: name.toLowerCase(),
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: async ([client, bot], interaction) => handleRequestQueryPlayback([client, bot], interaction, resolve),
			options: [query],
		})),
	],
};

export default command;
