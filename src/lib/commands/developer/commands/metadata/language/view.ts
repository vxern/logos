import { Bot, Interaction } from 'discordeno';
import { Client } from 'logos/src/lib/client.ts';
import { reply } from 'logos/src/lib/interactions.ts';
import constants from 'logos/src/constants.ts';

function handleViewLanguage([client, bot]: [Client, Bot], interaction: Interaction): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	return void reply([client, bot], interaction, {
		embeds: [{
			title: 'Server language',
			description: `The current server language is ${guild.language}.`,
			color: constants.colors.lightGreen,
		}],
	});
}

export { handleViewLanguage };
