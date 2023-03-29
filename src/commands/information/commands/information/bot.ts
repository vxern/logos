import {
	ApplicationCommandFlags,
	Bot,
	getAvatarURL,
	getUser,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Client, localise } from 'logos/src/client.ts';
import constants from 'logos/constants.ts';

async function handleDisplayBotInformation([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const botUser = client.cache.users.get(bot.id) ?? await getUser(bot, bot.id);

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
						url: getAvatarURL(bot, bot.id, botUser.discriminator, {
							avatar: botUser.avatar,
							size: 4096,
							format: 'png',
						}),
					},
					color: constants.colors.invisible,
					fields: [{
						name: localise(client, 'information.options.bot.strings.whoAmI.header', interaction.locale)(),
						value: localise(client, 'information.options.bot.strings.whoAmI.body', interaction.locale)(
							{ 'username': botUser.username },
						),
					}, {
						name: localise(client, 'information.options.bot.strings.howWasIMade.header', interaction.locale)(),
						value: localise(client, 'information.options.bot.strings.howWasIMade.body', interaction.locale)(
							{
								'language_link': constants.links.typescriptWebsite,
								'runtime_link': constants.links.denoWebsite,
								'api_link': constants.links.discordApiWebsite,
								'library_link': constants.links.discordenoRepository,
							},
						),
					}, {
						name: localise(
							client,
							'information.options.bot.strings.howToAddToServer.header',
							interaction.locale,
						)(),
						value: localise(
							client,
							'information.options.bot.strings.howToAddToServer.body',
							interaction.locale,
						)(
							{
								'learn_armenian_link': constants.links.learnArmenianListingWebsite,
								'learn_romanian_link': constants.links.learnRomanianListingWebsite,
							},
						),
					}, {
						name: localise(client, 'information.options.bot.strings.amIOpenSource.header', interaction.locale)(),
						value: localise(client, 'information.options.bot.strings.amIOpenSource.body', interaction.locale)(),
					}],
				}, {
					title: localise(client, 'information.options.bot.strings.contributions', interaction.locale)(),
					color: constants.colors.invisible,
					fields: constants.contributors.map((contributor) => ({
						name: `${contributor.username} — ${contributor.contribution}`,
						value: Object.entries(contributor.links).map(([platform, url]) => `[${platform}](${url})`).join(' · '),
					})),
				}],
			},
		},
	);
}

export { handleDisplayBotInformation };
