import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import { list } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { OptionTemplate } from "../../../command";

const option: OptionTemplate = {
	id: "bot",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayBotInformation,
};

async function handleDisplayBotInformation(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const botUser =
		client.entities.users.get(client.bot.id) ??
		(await client.bot.rest.getUser(client.bot.id).catch(() => {
			client.log.warn("Failed to get bot user.");
			return undefined;
		}));
	if (botUser === undefined) {
		return;
	}

	const strings = {
		concept: {
			title: client.localise("information.options.bot.strings.concept.title", locale)(),
			description: client.localise("information.options.bot.strings.concept.description", locale)(),
		},
		function: {
			title: client.localise("information.options.bot.strings.function.title", locale)(),
			description: client.localise("information.options.bot.strings.function.description", locale)(),
			features: {
				definitions: client.localise("information.options.bot.strings.function.features.definitions", locale)(),
				translations: client.localise("information.options.bot.strings.function.features.translations", locale)(),
				games: client.localise("information.options.bot.strings.function.features.games", locale)(),
				messages: client.localise("information.options.bot.strings.function.features.messages", locale)(),
				guides: client.localise("information.options.bot.strings.function.features.guides", locale)(),
			},
		},
		languages: {
			title: client.localise("information.options.bot.strings.languages.title", locale)(),
			description: client.localise("information.options.bot.strings.languages.description", locale)(),
		},
	};

	const featuresFormatted = list([
		`${constants.symbols.bot.features.definitions} ${strings.function.features.definitions}`,
		`${constants.symbols.bot.features.translations} ${strings.function.features.translations}`,
		`${constants.symbols.bot.features.games} ${strings.function.features.games}`,
		`${constants.symbols.bot.features.messages} ${strings.function.features.messages}`,
		`${constants.symbols.bot.features.guides} ${strings.function.features.guides}`,
	]);

	client.reply(interaction, {
		embeds: [
			{
				author: {
					iconUrl: Discord.avatarUrl(client.bot.id, botUser.discriminator, {
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
export default option;
