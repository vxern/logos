import { Client } from "logos/client";
import { User } from "logos/database/user";

async function handleDisplaySettings(client: Client, interaction: Logos.Interaction): Promise<void> {
	const { locale, language } = interaction;

	const userDocument = await User.getOrCreate(client, { userId: interaction.user.id.toString() });

	const strings = {
		title: client.localise("settings.strings.settings.title", locale)(),
		description: {
			language: {
				title: client.localise("settings.strings.settings.fields.language.title", locale)(),
				noLanguageSet: client.localise(
					"settings.strings.settings.fields.language.description.noLanguageSet.noLanguageSet",
					locale,
				)(),
				defaultShown: client.localise(
					"settings.strings.settings.fields.language.description.noLanguageSet.defaultShown",
					locale,
				)(),
				language: client.localise(
					constants.localisations.languages[userDocument.preferredLanguage ?? language],
					locale,
				)(),
			},
		},
	};

	await client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				color: constants.colours.blue,
				fields: [
					{
						name: strings.description.language.title,
						value:
							userDocument.preferredLanguage !== undefined
								? strings.description.language.language
								: `${strings.description.language.noLanguageSet} ${strings.description.language.defaultShown}`,
						inline: true,
					},
				],
			},
		],
	});
}

export { handleDisplaySettings };
