import { Bot, Interaction } from 'discordeno';
import { Client, getImplicitLanguage } from 'logos/src/lib/client.ts';
import { reply } from 'logos/src/lib/interactions.ts';
import constants from 'logos/src/constants.ts';

function handleResetLanguage([client, bot]: [Client, Bot], interaction: Interaction): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const language = getImplicitLanguage(guild);
	guild.language = language;

	return void reply([client, bot], interaction, {
		embeds: [{
			title: 'Server language reset',
			description: `The server language has been reset to ${language}.`,
			color: constants.colors.lightGreen,
		}],
	});
}

export { handleResetLanguage };
