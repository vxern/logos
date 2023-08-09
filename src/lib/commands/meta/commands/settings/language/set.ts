import constants from "../../../../../../constants/constants";
import languages, { Locale, getLocaleByLanguage, isLocalised } from "../../../../../../constants/languages";
import localisations from "../../../../../../constants/localisations";
import * as Logos from "../../../../../../types";
import { Client, localise } from "../../../../../client";
import { editReply, parseArguments, postponeReply, reply, respond } from "../../../../../interactions";
import { OptionTemplate } from "../../../../command";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "set",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleSetLanguage,
	handleAutocomplete: handleSetLanguageAutocomplete,
	options: [
		{
			name: "language",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
	],
};

async function handleSetLanguageAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const [{ language: languageOrUndefined }] = parseArguments(interaction.data?.options, {});
	const languageQuery = languageOrUndefined ?? "";

	const languageQueryLowercase = languageQuery.toLowerCase();
	const choices = languages.localisation
		.map((language) => {
			return {
				name: localise(client, localisations.languages[language], locale)(),
				value: language,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(languageQueryLowercase));

	respond([client, bot], interaction, choices);
}

async function handleSetLanguage([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const [{ language: languageOrUndefined }] = parseArguments(interaction.data?.options, {});
	if (languageOrUndefined === undefined) {
		displayError([client, bot], interaction, { locale: interaction.locale });
		return;
	}

	if (!isLocalised(languageOrUndefined)) {
		displayError([client, bot], interaction, { locale: interaction.locale });
		return;
	}

	const language = languageOrUndefined;

	await postponeReply([client, bot], interaction);

	const userDocument = await client.database.adapters.users.getOrFetch(client, "id", interaction.user.id.toString());
	if (userDocument === undefined) {
		return;
	}

	await client.database.adapters.users.update(client, {
		...userDocument,
		data: { ...userDocument.data, account: { ...userDocument.data.account, language } },
	});

	const locale = getLocaleByLanguage(language);

	const strings = {
		title: localise(client, "settings.strings.languageUpdated.title", locale)(),
		description: localise(
			client,
			"settings.strings.languageUpdated.description",
			locale,
		)({
			language: localise(client, localisations.languages[language], locale)(),
		}),
	};

	editReply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.lightGreen,
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
		title: localise(client, "settings.strings.invalid.title", locale)(),
		description: localise(client, "settings.strings.invalid.description", locale)(),
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
