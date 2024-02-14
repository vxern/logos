import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale, LocalisationLanguage } from "../../../../constants/languages";
import localisations from "../../../../constants/localisations";
import { Translation } from "../../../../constants/types/contributions";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { CommandTemplate } from "../../command";

const command: CommandTemplate = {
	id: "credits",
	type: Discord.ApplicationCommandTypes.ChatInput,
	handle: handleDisplayCredits,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
};

async function handleDisplayCredits(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	client.reply(interaction, { embeds: [getTranslationView(client, { locale })] });
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
			language: client.localise(localisations.languages[language], locale)(),
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

	return { title: strings.translation, fields, color: constants.colors.blue };
}

export default command;
