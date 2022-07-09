import { Interaction } from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { list } from '../../../../formatting.ts';

/** Displays information about the bot (application). */
function displayBotInformation(
	_client: Client,
	interaction: Interaction,
): void {
	const botUser = interaction.client.user!;

	interaction.respond({
		ephemeral: true,
		embeds: [{
			title: botUser.username,
			thumbnail: { url: botUser.avatarURL() },
			color: configuration.interactions.responses.colors.invisible,
			fields: [{
				name: 'What am I?',
				value:
					`I am **${botUser.username}**, a Discord application created to provide language-learning servers with the highest quality features, such as:
${
						list([
							'Rich social interactions',
							'Intuitive role management',
							'Translation and morphology look-ups',
							'Music playback',
							'Article creation',
							'Server structure synchronisation',
						])
					}`,
			}, {
				name: 'How was I made?',
				value:
					'I am powered by [TypeScript](https://www.typescriptlang.org/) running within [Deno](https://deno.land/). I interact with [Discord\'s API](https://discord.com/developers/docs/intro) with the help of [Harmony](https://github.com/harmonyland/harmony).',
			}, {
				name: 'How can you add me to your server?',
				value:
					'You cannot just yet. I was made for the purpose of managing a select few language-learning servers, such as the [Armenian](https://discord.me/learnarmenian), [Belarusian](https://discord.me/learnbelarusian) and [Romanian](https://discord.me/learnromanian) communities.',
			}, {
				name: 'Am I open-source?',
				value:
					'Unfortunately, no. However, my predecessor, Talon, *is*. You can view his source code [here](https://github.com/linguition/talon).',
			}],
		}],
	});
}

export { displayBotInformation };
