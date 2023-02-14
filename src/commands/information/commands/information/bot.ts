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
						name: localise(Commands.information.options.bot.strings.whoAmI.header, interaction.locale),
						value: localise(Commands.information.options.bot.strings.whoAmI.body, interaction.locale)(botUser.username),
					}, {
						name: localise(Commands.information.options.bot.strings.howWasIMade.header, interaction.locale),
						value: localise(
							Commands.information.options.bot.strings.howWasIMade.body(
								`[TypeScript](${constants.links.typescriptWebsite})`,
								`[Deno](${constants.links.denoWebsite})`,
								constants.links.discordApiWebsite,
								`[discordeno](${constants.links.discordenoRepository})`,
							),
							interaction.locale,
						),
					}, {
						name: localise(Commands.information.options.bot.strings.howToAddToServer.header, interaction.locale),
						value: localise(
							Commands.information.options.bot.strings.howToAddToServer.body(
								`[🇦🇲 Learn Armenian](${constants.links.learnArmenianListingWebsite})`,
								`[🇷🇴 Learn Romanian](${constants.links.learnRomanianListingWebsite})`,
							),
							interaction.locale,
						),
					}, {
						name: localise(Commands.information.options.bot.strings.amIOpenSource.header, interaction.locale),
						value: localise(Commands.information.options.bot.strings.amIOpenSource.body, interaction.locale)(
							constants.links.talonRepositoryLink,
						),
					}],
				}, {
					title: localise(Commands.information.options.bot.strings.contributions, interaction.locale),
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
