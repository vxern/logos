import { getTranslatorLicence, isValidLicensedTranslator } from "logos:constants/licences";
import type { Client } from "logos/client";

async function handleDisplayTranslatorLicenceAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { translator: string }>,
): Promise<void> {
	const translatorLowercase = interaction.parameters.translator.trim().toLowerCase();
	const choices = Object.entries(constants.licences.translators)
		.map(([translatorKey, translator]) => {
			return {
				name: translator.name,
				value: translatorKey,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(translatorLowercase));

	await client.respond(interaction, choices);
}

async function handleDisplayTranslatorLicence(
	client: Client,
	interaction: Logos.Interaction<any, { translator: string }>,
): Promise<void> {
	if (!isValidLicensedTranslator(interaction.parameters.translator)) {
		await displayError(client, interaction);
		return;
	}

	const licence = getTranslatorLicence(interaction.parameters.translator);

	const strings = constants.contexts.licence({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});

	await client.notice(interaction, {
		author: {
			name: strings.title({ entity: licence.name }),
			iconUrl: licence.faviconLink,
			url: licence.link,
		},
		description: licence.notices !== undefined ? `*${licence.notices.licence}*` : undefined,
		image: licence.notices?.badgeLink !== undefined ? { url: licence.notices.badgeLink } : undefined,
		fields: [
			{
				name: strings.fields.source,
				value: licence.link,
			},
			...(licence.notices?.copyright !== undefined
				? [
						{
							name: strings.fields.copyright,
							value: licence.notices.copyright,
						},
					]
				: []),
		],
	});
}

async function displayError(client: Client, interaction: Logos.Interaction): Promise<void> {
	const strings = constants.contexts.invalidLicence({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});

	await client.error(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

export { handleDisplayTranslatorLicence, handleDisplayTranslatorLicenceAutocomplete };
