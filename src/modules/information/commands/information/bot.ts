import { Interaction } from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { bold, italic, list } from '../../../../formatting.ts';

/** Displays information about the bot (application). */
function displayBotInformation(_: Client, interaction: Interaction): void {
	const application = interaction.client.user!;

	interaction.respond({
		embeds: [{
			title: application.username,
			thumbnail: { url: application.avatarURL() },
			color: configuration.interactions.responses.colors.invisible,
			fields: [{
				name: 'What am I?',
				value: `I am ${
					bold(application.username)
				}, a Discord application created to provide language-learning servers with the highest quality features, such as:
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
				value: `No, unfortunately. However, my predecessor, Talon, ${
					italic('is')
				}. You can view his source code [here](https://github.com/vxern/talon).`,
			}],
		}],
		ephemeral: true,
	});
}

export { displayBotInformation };
