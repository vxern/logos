import constants from "../../../../../../constants.js";
import { supportedLanguages } from "../../../../../../types.js";
import { Client } from "../../../../../client.js";
import { reply } from "../../../../../interactions.js";
import { parseArguments } from "../../../../../interactions.js";
import { Bot, Interaction } from "discordeno";

async function handleSetLanguage([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ language: input }] = parseArguments(interaction.data?.options, {});
	if (input === undefined) {
		return;
	}

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const inputLowercase = input.toLowerCase();
	const language = supportedLanguages.find((language) => language.toLowerCase().startsWith(inputLowercase));

	if (language === undefined) {
		reply([client, bot], interaction, {
			embeds: [
				{
					title: "No language found",
					description: `No language matches the query '${input}'.`,
					color: constants.colors.yellow,
				},
			],
		});
		return;
	}

	guild.language = language;

	reply([client, bot], interaction, {
		embeds: [
			{
				title: "Server language set",
				description: `The server language has been set to ${language}.`,
				color: constants.colors.lightGreen,
			},
		],
	});
}

export { handleSetLanguage };
