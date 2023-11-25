import * as Discord from "@discordeno/bot";
import constants from "../../../../../../constants/constants";
import languages, {
	Locale,
	getLocaleByLocalisationLanguage,
	isLocalisationLanguage,
} from "../../../../../../constants/languages";
import localisations from "../../../../../../constants/localisations";
import * as Logos from "../../../../../../types";
import { Client, localise } from "../../../../../client";
import { User } from "../../../../../database/user";
import { editReply, parseArguments, postponeReply, reply, respond } from "../../../../../interactions";
import { OptionTemplate } from "../../../../command";

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
	const choices = languages.languages.localisation
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

	if (!isLocalisationLanguage(languageOrUndefined)) {
		displayError([client, bot], interaction, { locale: interaction.locale });
		return;
	}

	const language = languageOrUndefined;

	await postponeReply([client, bot], interaction);

	const session = client.database.openSession();

	const userDocument =
		client.cache.documents.users.get(interaction.user.id.toString()) ??
		(await session.load<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined));

	if (userDocument === undefined) {
		return;
	}

	userDocument.account.language = language;
	await session.store(userDocument);
	await session.saveChanges();
	session.dispose();

	const locale = getLocaleByLocalisationLanguage(language);

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
