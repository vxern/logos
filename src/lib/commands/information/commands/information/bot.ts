import constants from "../../../../../constants/constants";
import { list } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client, localise } from "../../../../client";
import { reply } from "../../../../interactions";
import { chunk } from "../../../../utils";
import * as Discord from "discordeno";

async function handleDisplayBotInformation(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const botUser =
		client.cache.users.get(bot.id) ??
		(await Discord.getUser(bot, bot.id).catch(() => {
			client.log.warn("Failed to get bot user.");
			return undefined;
		}));
	if (botUser === undefined) {
		return;
	}

	const strings = {
		information: {
			whoAmI: {
				title: localise(client, "information.options.bot.strings.whoAmI.title", locale)(),
				description: localise(client, "information.options.bot.strings.whoAmI.description", locale)(),
				features: {
					roles: localise(client, "information.options.bot.strings.whoAmI.features.roles", locale)(),
					language: localise(client, "information.options.bot.strings.whoAmI.features.language", locale)(),
					music: localise(client, "information.options.bot.strings.whoAmI.features.music", locale)(),
				},
			},
			howWasIMade: {
				title: localise(client, "information.options.bot.strings.howWasIMade.title", locale)(),
				description: localise(
					client,
					"information.options.bot.strings.howWasIMade.description",
					locale,
				)({
					language_link: constants.links.typescriptWebsite,
					runtime_link: constants.links.nodeWebsite,
					api_link: constants.links.discordApiWebsite,
					library_link: constants.links.discordenoRepository,
				}),
			},
			howToAddToServer: {
				title: localise(client, "information.options.bot.strings.howToAddToServer.title", locale)(),
				description: localise(
					client,
					"information.options.bot.strings.howToAddToServer.description",
					locale,
				)({
					learn_armenian_link: constants.links.learnArmenianListingWebsite,
					learn_romanian_link: constants.links.learnRomanianListingWebsite,
				}),
			},
			amIOpenSource: {
				title: localise(client, "information.options.bot.strings.amIOpenSource.title", locale)(),
				description: localise(client, "information.options.bot.strings.amIOpenSource.description", locale)(),
			},
		},
		translators: {
			title: localise(client, "information.options.bot.strings.translators.title", locale)(),
		},
	};

	const featuresFormatted = list([
		`${constants.symbols.bot.features.roles} ${strings.information.whoAmI.features.roles}`,
		`${constants.symbols.bot.features.language} ${strings.information.whoAmI.features.language}`,
		`${constants.symbols.bot.features.music} ${strings.information.whoAmI.features.music}`,
	]);

	reply([client, bot], interaction, {
		embeds: [
			{
				title: botUser.username,
				thumbnail: {
					url: Discord.getAvatarURL(bot, bot.id, botUser.discriminator, {
						avatar: botUser.avatar,
						size: 4096,
						format: "png",
					}),
				},
				color: constants.colors.blue,
				fields: [
					{
						name: strings.information.whoAmI.title,
						value: `${strings.information.whoAmI.description}\n${featuresFormatted}`,
					},
					{
						name: strings.information.howWasIMade.title,
						value: strings.information.howWasIMade.description,
					},
					{
						name: strings.information.howToAddToServer.title,
						value: strings.information.howToAddToServer.description,
					},
					{
						name: strings.information.amIOpenSource.title,
						value: strings.information.amIOpenSource.description,
					},
				],
			},
			{
				title: strings.translators.title,
				color: constants.colors.blue,
				fields: getContributorString(constants.contributions.translation),
			},
		],
	});
}

function getContributorString(contributions: typeof constants.contributions.translation): Discord.EmbedField[] {
	const fields: Discord.EmbedField[] = [];
	for (const [language, data] of Object.entries(contributions)) {
		const contributorsFormatted = chunk(
			data.contributors.map((contributor) => {
				if ("link" in contributor) {
					return `**[${contributor.username}](${contributor.link})**`;
				}

				return `**${contributor.username}**`;
			}),
			3,
		)
			.map((chunks) => chunks.join(" "))
			.join("\n");

		fields.push({
			name: `${language} ${data.flag}`,
			value: contributorsFormatted,
			inline: true,
		});
	}
	return fields;
}

export { handleDisplayBotInformation };
