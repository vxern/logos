import { list } from "logos:constants/formatting";
import type { Client } from "logos/client";

async function handleDisplayBotInformation(client: Client, interaction: Logos.Interaction): Promise<void> {
	const botUser = client.entities.users.get(client.bot.id);
	if (botUser === undefined) {
		return;
	}

	const strings = constants.contexts.botInformation({ localise: client.localise, locale: interaction.displayLocale });

	const featuresFormatted = list([
		`${constants.emojis.bot.features.definitions} ${strings.function.features.definitions}`,
		`${constants.emojis.bot.features.translations} ${strings.function.features.translations}`,
		`${constants.emojis.bot.features.games} ${strings.function.features.games}`,
		`${constants.emojis.bot.features.messages} ${strings.function.features.messages}`,
		`${constants.emojis.bot.features.guides} ${strings.function.features.guides}`,
	]);

	client
		.notice(interaction, {
			author: {
				iconUrl: Discord.avatarUrl(client.bot.id, botUser.discriminator, {
					avatar: botUser.avatar ?? undefined,
					format: "png",
				}),
				name: botUser.username,
			},
			fields: [
				{
					name: `${constants.emojis.information.bot} ${strings.concept.title}`,
					value: strings.concept.description,
				},
				{
					name: `${constants.emojis.information.function} ${strings.function.title}`,
					value: `${strings.function.description}\n${featuresFormatted}`,
				},
				{
					name: `${constants.emojis.information.languages} ${strings.languages.title}`,
					value: strings.languages.description,
				},
			],
		})
		.ignore();
}

export { handleDisplayBotInformation };
