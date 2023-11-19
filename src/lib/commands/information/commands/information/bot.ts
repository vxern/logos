import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import { list } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client, localise } from "../../../../client";
import { reply } from "../../../../interactions";

async function handleDisplayBotInformation(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const botUser =
		client.cache.users.get(bot.id) ??
		(await bot.rest.getUser(bot.id).catch(() => {
			client.log.warn("Failed to get bot user.");
			return undefined;
		}));
	if (botUser === undefined) {
		return;
	}

	const strings = {
		concept: {
			title: localise(client, "information.options.bot.strings.concept.title", locale)(),
			description: localise(client, "information.options.bot.strings.concept.description", locale)(),
		},
		function: {
			title: localise(client, "information.options.bot.strings.function.title", locale)(),
			description: localise(client, "information.options.bot.strings.function.description", locale)(),
			features: {
				definitions: localise(client, "information.options.bot.strings.function.features.definitions", locale)(),
				translations: localise(client, "information.options.bot.strings.function.features.translations", locale)(),
				games: localise(client, "information.options.bot.strings.function.features.games", locale)(),
				messages: localise(client, "information.options.bot.strings.function.features.messages", locale)(),
				guides: localise(client, "information.options.bot.strings.function.features.guides", locale)(),
			},
		},
		languages: {
			title: localise(client, "information.options.bot.strings.languages.title", locale)(),
			description: localise(client, "information.options.bot.strings.languages.description", locale)(),
		},
	};

	const featuresFormatted = list([
		`${constants.symbols.bot.features.definitions} ${strings.function.features.definitions}`,
		`${constants.symbols.bot.features.translations} ${strings.function.features.translations}`,
		`${constants.symbols.bot.features.games} ${strings.function.features.games}`,
		`${constants.symbols.bot.features.messages} ${strings.function.features.messages}`,
		`${constants.symbols.bot.features.guides} ${strings.function.features.guides}`,
	]);

	reply([client, bot], interaction, {
		embeds: [
			{
				author: {
					iconUrl: Discord.avatarUrl(bot.id, botUser.discriminator, {
						avatar: botUser.avatar ?? undefined,
						format: "png",
					}),
					name: botUser.username,
				},
				color: constants.colors.blue,
				fields: [
					{
						name: `${constants.symbols.information.bot} ${strings.concept.title}`,
						value: strings.concept.description,
					},
					{
						name: `${constants.symbols.information.function} ${strings.function.title}`,
						value: `${strings.function.description}\n${featuresFormatted}`,
					},
					{
						name: `${constants.symbols.information.languages} ${strings.languages.title}`,
						value: strings.languages.description,
					},
				],
			},
		],
	});
}

export { handleDisplayBotInformation };
