import constants from "../../../../../../constants.js";
import { Client } from "../../../../../client.js";
import { reply } from "../../../../../interactions.js";
import { Bot, Interaction } from "discordeno";

async function handleViewLanguage([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	reply([client, bot], interaction, {
		embeds: [
			{
				title: "Server language",
				description: `The current server language is ${guild.language}.`,
				color: constants.colors.lightGreen,
			},
		],
	});
}

export { handleViewLanguage };
