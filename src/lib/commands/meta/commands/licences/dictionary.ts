import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import { Locale } from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import * as Logos from "../../../../../types";
import { Client, localise } from "../../../../client";
import { parseArguments, reply, respond } from "../../../../interactions";
import { OptionTemplate } from "../../../command";

const command: OptionTemplate = {
	name: "dictionary",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayDictionaryLicence,
	handleAutocomplete: handleDisplayDictionaryLicenceAutocomplete,
	options: [
		{
			name: "dictionary",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
	],
};

async function handleDisplayDictionaryLicenceAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const [{ dictionary: dictionaryOrUndefined }] = parseArguments(interaction.data?.options, {});
	const dictionaryQuery = dictionaryOrUndefined ?? "";

	const dictionaryQueryLowercase = dictionaryQuery.toLowerCase();
	const choices = Object.entries(licences.dictionaries)
		.map(([dictionaryKey, dictionary]) => {
			return {
				name: dictionary.name,
				value: dictionaryKey,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(dictionaryQueryLowercase));

	respond([client, bot], interaction, choices);
}

async function handleDisplayDictionaryLicence(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const [{ dictionary: dictionaryOrUndefined }] = parseArguments(interaction.data?.options, {});
	if (dictionaryOrUndefined === undefined) {
		displayError([client, bot], interaction, { locale: interaction.locale });
		return;
	}

	if (!(dictionaryOrUndefined in licences.dictionaries)) {
		displayError([client, bot], interaction, { locale: interaction.locale });
		return;
	}

	const dictionaryName = dictionaryOrUndefined as keyof typeof licences.dictionaries;
	const licenceInformation = licences.dictionaries[dictionaryName];

	const strings = {
		title: localise(client, "license.strings.license", locale)({ entity: licenceInformation.name }),
		fields: {
			source: localise(client, "license.strings.source", locale)(),
			copyright: localise(client, "license.strings.copyright", locale)(),
		},
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				author: {
					name: strings.title,
					iconUrl: "faviconLink" in licenceInformation ? licenceInformation.faviconLink : undefined,
					url: licenceInformation.link,
				},
				description: `*${licenceInformation.notices.licence}*`,
				image: "badgeLink" in licenceInformation.notices ? { url: licenceInformation.notices.badgeLink } : undefined,
				color: constants.colors.greenishLightGray,
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
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "licenses.strings.invalid.title", locale)(),
		description: localise(client, "licenses.strings.invalid.description", locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			},
		],
	});
}

export default command;
