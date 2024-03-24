import { Translation } from "logos:constants/contributions";
import { Locale, LocalisationLanguage } from "logos:constants/languages";
import { Client } from "logos/client";

async function handleDisplayCredits(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	await client.reply(interaction, { embeds: [getTranslationView(client, { locale })] });
}

function getTranslationView(client: Client, { locale }: { locale: Locale }): Discord.CamelizedDiscordEmbed {
	const fields: Discord.CamelizedDiscordEmbedField[] = [];

	for (const [language, data] of (
		Object.entries(constants.contributions.translation) as [LocalisationLanguage, Translation][]
	).sort(([_, a], [__, b]) => b.completion - a.completion)) {
		const contributorsFormatted = data.contributors
			.map((contributor) => {
				if (contributor.link !== undefined) {
					return `[${contributor.username}](${contributor.link})`;
				}

				return `${contributor.username}`;
			})
			.map((contributor) => `- ${contributor}`)
			.join("\n");

		const strings = {
			language: client.localise(constants.localisations.languages[language], locale)(),
		};

		fields.push({
			name: `${data.flag} ${strings.language} (${data.completion * 10}%)`,
			value: contributorsFormatted,
			inline: true,
		});
	}

	const strings = {
		translation: client.localise("credits.strings.translation", locale)(),
	};

	return { title: strings.translation, fields, color: constants.colours.blue };
}

export { handleDisplayCredits };
