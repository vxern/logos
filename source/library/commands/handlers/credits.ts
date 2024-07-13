import type { Translation } from "logos:constants/contributions";
import type { LocalisationLanguage } from "logos:constants/languages";
import type { Client } from "logos/client";

async function handleDisplayCredits(client: Client, interaction: Logos.Interaction): Promise<void> {
	await client.notice(interaction, getTranslationView(client, interaction));
}

function getTranslationView(client: Client, interaction: Logos.Interaction): Discord.CamelizedDiscordEmbed {
	const fields: Discord.CamelizedDiscordEmbedField[] = [];

	const strings = {
		...constants.contexts.credits({ localise: client.localise, locale: interaction.locale }),
		...constants.contexts.language({ localise: client.localise, locale: interaction.locale }),
	};
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

		fields.push({
			name: `${data.flag} ${strings.language(language)} (${data.completion * 10}%)`,
			value: contributorsFormatted,
			inline: true,
		});
	}

	return { title: strings.translation, fields };
}

export { handleDisplayCredits };
