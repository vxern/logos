import { Locale } from "../../../../../constants/languages";
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

	if (!(interaction.parameters.dictionary in constants.licences.dictionaries)) {
		displayError(client, interaction, { locale: interaction.locale });
		return;
	}

	// TODO(vxern): Use distinct type instead of keyof typeof.
	const dictionaryName = interaction.parameters.dictionary as keyof typeof constants.licences.dictionaries;
	const licenceInformation = constants.licences.dictionaries[dictionaryName];

	const strings = {
		title: client.localise("license.strings.license", locale)({ entity: licenceInformation.name }),
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
					iconUrl: "faviconLink" in licenceInformation ? licenceInformation.faviconLink : undefined,
					url: licenceInformation.link,
				},
				description: `*${licenceInformation.notices.licence}*`,
				color: constants.colours.greenishLightGray,
				fields: [
					{
						name: strings.fields.source,
						value: licenceInformation.link,
					},
					...("copyright" in licenceInformation.notices
						? [
								{
									name: strings.fields.copyright,
									value: licenceInformation.notices.copyright,
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