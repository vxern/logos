import { Bot, Interaction } from 'discordeno';
import { Client } from 'logos/src/lib/client.ts';
import { reply } from 'logos/src/lib/interactions.ts';
import { parseArguments } from 'logos/src/lib/interactions.ts';
import constants from 'logos/src/constants.ts';
import { supportedLanguages } from 'logos/src/types.ts';

function handleSetLanguage([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ language: input }] = parseArguments(interaction.data?.options, {});
	if (input === undefined) return;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const inputLowercase = input.toLowerCase();
	const language = supportedLanguages.find((language) => language.toLowerCase().startsWith(inputLowercase));

	if (language === undefined) {
		return void reply([client, bot], interaction, {
			embeds: [{
				title: 'No language found',
				description: `No language matches the query '${input}'.`,
				color: constants.colors.yellow,
			}],
		});
	}

	guild.language = language;

	return void reply([client, bot], interaction, {
		embeds: [{
			title: 'Server language set',
			description: `The server language has been set to ${language}.`,
			color: constants.colors.lightGreen,
		}],
	});
}

export { handleSetLanguage };
