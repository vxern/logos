import { Locale } from "../../../../../constants/languages";
import { getDictionaryLicenceByDictionary, isValidDictionary } from "../../../../../constants/licences";
import { Client } from "../../../../client";

async function handleDisplayDictionaryLicenceAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { dictionary: string }>,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const dictionaryLowercase = interaction.parameters.dictionary.trim().toLowerCase();
	const choices = Object.entries(constants.licences.dictionaries)
		.map(([dictionaryKey, dictionary]) => {
			return {
				name: dictionary.name,
				value: dictionaryKey,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(dictionaryLowercase));

	client.respond(interaction, choices);
}

async function handleDisplayDictionaryLicence(
	client: Client,
	interaction: Logos.Interaction<any, { dictionary: string }>,
): Promise<void> {
	const locale = interaction.locale;

	if (!isValidDictionary(interaction.parameters.dictionary)) {
		displayError(client, interaction, { locale: interaction.locale });
		return;
	}

	const licence = getDictionaryLicenceByDictionary(interaction.parameters.dictionary);

	const strings = {
		title: client.localise("license.strings.license", locale)({ entity: licence.name }),
		fields: {
			source: client.localise("license.strings.source", locale)(),
			copyright: client.localise("license.strings.copyright", locale)(),
		},
	};

	client.reply(interaction, {
		embeds: [
			{
				author: {
					name: strings.title,
					iconUrl: licence.faviconLink,
					url: licence.link,
				},
				description: `*${licence.notices.licence}*`,
				color: constants.colours.greenishLightGray,
				fields: [
					{
						name: strings.fields.source,
						value: licence.link,
					},
					...(licence.notices.copyright !== undefined
						? [
								{
									name: strings.fields.copyright,
									value: licence.notices.copyright,
								},
						  ]
						: []),
				],
			},
		],
	});
}

async function displayError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("licenses.strings.invalid.title", locale)(),
		description: client.localise("licenses.strings.invalid.description", locale)(),
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colours.red,
			},
		],
	});
}

export { handleDisplayDictionaryLicence, handleDisplayDictionaryLicenceAutocomplete };
