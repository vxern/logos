import {
	ApplicationCommandFlags,
	Bot,
	getAvatarURL,
	getUser,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { Client } from 'logos/src/client.ts';
import configuration from 'logos/configuration.ts';

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
						name: localise(
							Commands.information.options.bot.strings.whoAmI.header,
							interaction.locale,
						),
						value: localise(
							Commands.information.options.bot.strings.whoAmI.body,
							interaction.locale,
						)(botUser),
					}, {
						name: localise(
							Commands.information.options.bot.strings.howWasIMade.header,
							interaction.locale,
						),
						value: localise(
							Commands.information.options.bot.strings.howWasIMade.body,
							interaction.locale,
						),
					}, {
						name: localise(
							Commands.information.options.bot.strings.howToAddToServer.header,
							interaction.locale,
						),
						value: localise(
							Commands.information.options.bot.strings.howToAddToServer.body,
							interaction.locale,
						),
					}, {
						name: localise(
							Commands.information.options.bot.strings.amIOpenSource.header,
							interaction.locale,
						),
						value: localise(
							Commands.information.options.bot.strings.amIOpenSource.body,
							interaction.locale,
						),
					}],
				}],
			},
		},
	);
}

export { displayBotInformation };
