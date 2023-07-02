import constants from "../../../../../../constants.js";
import { Client, getImplicitLanguage } from "../../../../../client.js";
import { reply } from "../../../../../interactions.js";
import * as Discord from "discordeno";

async function handleResetLanguage(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const language = getImplicitLanguage(guild);
	guild.language = language;

	reply([client, bot], interaction, {
		embeds: [
			{
				title: "Server language reset",
				description: `The server language has been reset to ${language}.`,
				color: constants.colors.lightGreen,
			},
		],
	});
}

export { handleResetLanguage };
