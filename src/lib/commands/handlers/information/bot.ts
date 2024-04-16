import { ContextBuilder } from "logos:constants/contexts";
import { Locale } from "logos:constants/languages";
import { list } from "logos:core/formatting";
import { Client } from "logos/client";

async function withContext<T>(
	{ localise, locale, builder }: { localise: Client["localise"]; locale: Locale; builder: ContextBuilder<T> },
	action: ({ strings }: { strings: T }) => Promise<void>,
): Promise<void> {
	const strings = builder({ localise, locale });

	await action({ strings });
}

async function handleDisplayBotInformation(client: Client, interaction: Logos.Interaction): Promise<void> {
	const botUser =
		client.entities.users.get(client.bot.id) ??
		(await client.bot.rest.getUser(client.bot.id).catch(() => {
			client.log.warn("Failed to get bot user.");
			return undefined;
		}));
	if (botUser === undefined) {
		return;
	}

	await withContext(
		{
			localise: client.localise.bind(client),
			locale: interaction.locale,
			builder: constants.contexts.botInformation,
		},
		async ({ strings }) => {
			const featuresFormatted = list([
				`${constants.emojis.bot.features.definitions} ${strings.function.features.definitions}`,
				`${constants.emojis.bot.features.translations} ${strings.function.features.translations}`,
				`${constants.emojis.bot.features.games} ${strings.function.features.games}`,
				`${constants.emojis.bot.features.messages} ${strings.function.features.messages}`,
				`${constants.emojis.bot.features.guides} ${strings.function.features.guides}`,
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
			});
		},
	);
}

export { handleDisplayBotInformation };
