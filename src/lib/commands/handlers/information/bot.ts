import { list } from "logos:core/formatting";
import { Client } from "logos/client";

async function handleDisplayBotInformation(client: Client, interaction: Logos.Interaction): Promise<void> {
	const botUser =
		client.entities.users.get(client.bot.id) ??
		(await client.bot.helpers.getUser(client.bot.id).catch(() => {
			client.log.warn("Failed to get bot user.");
			return undefined;
		}));
	if (botUser === undefined) {
		return;
	}

	await client.withContext(interaction, { contexts: [constants.contexts.botInformation] }, async (context) => {
		const featuresFormatted = list([
			`${constants.emojis.bot.features.definitions} ${context.function.features.definitions}`,
			`${constants.emojis.bot.features.translations} ${context.function.features.translations}`,
			`${constants.emojis.bot.features.games} ${context.function.features.games}`,
			`${constants.emojis.bot.features.messages} ${context.function.features.messages}`,
			`${constants.emojis.bot.features.guides} ${context.function.features.guides}`,
		]);

		await client.notice(interaction, {
			author: {
				iconUrl: Discord.avatarUrl(client.bot.id, botUser.discriminator, {
					avatar: botUser.avatar ?? undefined,
					format: "png",
				}),
				name: botUser.username,
			},
			fields: [
				{
					name: `${constants.emojis.information.bot} ${context.concept.title}`,
					value: context.concept.description,
				},
				{
					name: `${constants.emojis.information.function} ${context.function.title}`,
					value: `${context.function.description}\n${featuresFormatted}`,
				},
				{
					name: `${constants.emojis.information.languages} ${context.languages.title}`,
					value: context.languages.description,
				},
			],
		});
	});
}

export { handleDisplayBotInformation };
