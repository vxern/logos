import { getDictionaryLicenceByDictionary, isValidDictionary } from "logos:constants/licences";
import type { Client } from "logos/client";

async function handleDisplayDictionaryLicenceAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { dictionary: string }>,
): Promise<void> {
	const dictionaryLowercase = interaction.parameters.dictionary.trim().toLowerCase();
	const choices = Object.entries(constants.licences.dictionaries)
		.map(([dictionaryKey, dictionary]) => {
			return {
				name: dictionary.name,
				value: dictionaryKey,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(dictionaryLowercase));

	await client.respond(interaction, choices);
}

async function handleDisplayDictionaryLicence(
	client: Client,
	interaction: Logos.Interaction<any, { dictionary: string }>,
): Promise<void> {
	if (!isValidDictionary(interaction.parameters.dictionary)) {
		await displayError(client, interaction);
		return;
	}

	const licence = getDictionaryLicenceByDictionary(interaction.parameters.dictionary);

	const strings = constants.contexts.dictionaryLicence({
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

export { handleDisplayDictionaryLicence, handleDisplayDictionaryLicenceAutocomplete };
