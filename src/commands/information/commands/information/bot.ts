import {
	ApplicationCommandFlags,
	Bot,
	getAvatarURL,
	getUser,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { links } from '../../../../constants.ts';
import { list } from '../../../../formatting.ts';

/** Displays information about the bot (application). */
async function displayBotInformation(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const botUser = client.cache.users.get(bot.id) ?? await getUser(bot, bot.id);
	if (!botUser) return;

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: botUser.username,
					thumbnail: {
						url: getAvatarURL(
							bot,
							bot.id,
							botUser.discriminator,
							{ avatar: botUser.avatar, size: 4096, format: 'png' },
						),
					},
					color: configuration.interactions.responses.colors.invisible,
					fields: [{
						name: 'What am I?',
						value:
							`I am **${botUser.username}**, an application created to provide language-learning Discord communities with the highest quality features, such as:
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
							`I am powered by [TypeScript](${links.typescriptWebsite}) running within [Deno](${links.denoWebsite}). I interact with [Discord\'s API](${links.discordApiWebsite}) with the help of [discordeno](${links.discordenoRepository}).`,
					}, {
						name: 'How can you add me to your server?',
						value:
							`You cannot just yet. I was made for the purpose of managing a select few language-learning communities, such as [Learn Armenian](${links.learnArmenianListingWebsite}) and [Learn Romanian](${links.learnRomanianListingWebsite}).`,
					}, {
						name: 'Am I open-source?',
						value:
							`Unfortunately, no. However, my predecessor, Talon, *is*. You can view his source code [here](${links.talonRepositoryLink}).`,
					}],
				}],
			},
		},
	);
}

export { displayBotInformation };
