import { Client } from "logos/client";
import { User } from "logos/database/user";

async function handleDisplaySettings(client: Client, interaction: Logos.Interaction): Promise<void> {
	const userDocument = await User.getOrCreate(client, { userId: interaction.user.id.toString() });

	const strings = constants.contexts.settings({ localise: client.localise, locale: interaction.locale });
	await client.notice(interaction, {
		title: strings.title,
		fields: [
			{
				name: strings.description.language.title,
				value:
					userDocument.preferredLanguage !== undefined
						? client.localise(
							constants.localisations.languages[userDocument.preferredLanguage ?? interaction.language],
							interaction.locale,
						)()
						: `${strings.description.language.noLanguageSet} ${strings.description.language.defaultShown}`,
				inline: true,
			},
		],
	});
}

export { handleDisplaySettings };
