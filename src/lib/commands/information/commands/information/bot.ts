import constants from "../../../../../constants/constants";
import { list } from "../../../../../formatting";
import { Client, localise } from "../../../../client";
import { reply } from "../../../../interactions";
import { chunk } from "../../../../utils";
import * as Discord from "discordeno";

async function handleDisplayBotInformation(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
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
				title: localise(client, "information.options.bot.strings.whoAmI.title", interaction.locale)(),
				description: localise(
					client,
					"information.options.bot.strings.whoAmI.description",
					interaction.locale,
				)({ username: botUser.username }),
				features: {
					roles: localise(client, "information.options.bot.strings.whoAmI.features.roles", interaction.locale)(),
					language: localise(client, "information.options.bot.strings.whoAmI.features.language", interaction.locale)(),
					music: localise(client, "information.options.bot.strings.whoAmI.features.music", interaction.locale)(),
				},
			},
			howWasIMade: {
				title: localise(client, "information.options.bot.strings.howWasIMade.title", interaction.locale)(),
				description: localise(
					client,
					"information.options.bot.strings.howWasIMade.description",
					interaction.locale,
				)({
					language_link: constants.links.typescriptWebsite,
					runtime_link: constants.links.nodeWebsite,
					api_link: constants.links.discordApiWebsite,
					library_link: constants.links.discordenoRepository,
				}),
			},
			howToAddToServer: {
				title: localise(client, "information.options.bot.strings.howToAddToServer.title", interaction.locale)(),
				description: localise(
					client,
					"information.options.bot.strings.howToAddToServer.description",
					interaction.locale,
				)({
					learn_armenian_link: constants.links.learnArmenianListingWebsite,
					learn_romanian_link: constants.links.learnRomanianListingWebsite,
				}),
			},
			amIOpenSource: {
				title: localise(client, "information.options.bot.strings.amIOpenSource.title", interaction.locale)(),
				description: localise(
					client,
					"information.options.bot.strings.amIOpenSource.description",
					interaction.locale,
				)(),
			},
		},
		translators: {
			title: localise(client, "information.options.bot.strings.translators.title", interaction.locale)(),
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

type EmbedFields = NonNullable<Discord.Embed["fields"]>;

function getContributorString(contributions: typeof constants.contributions.translation): EmbedFields {
	const fields: EmbedFields = [];
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
