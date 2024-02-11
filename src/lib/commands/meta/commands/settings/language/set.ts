import * as Discord from "@discordeno/bot";
import constants from "../../../../../../constants/constants";
import languages, {
	Locale,
	getLocaleByLocalisationLanguage,
	isLocalisationLanguage,
} from "../../../../../../constants/languages";
import localisations from "../../../../../../constants/localisations";
import { trim } from "../../../../../../formatting";
import * as Logos from "../../../../../../types";
import { Client } from "../../../../../client";
import { User } from "../../../../../database/user";
import { editReply, parseArguments, postponeReply, reply, respond } from "../../../../../interactions";
import { OptionTemplate } from "../../../../command";

const command: OptionTemplate = {
	id: "set",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleSetLanguage,
	handleAutocomplete: handleSetLanguageAutocomplete,
	options: [
		{
			id: "language",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
	],
};

async function handleSetLanguageAutocomplete(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const [{ language: languageOrUndefined }] = parseArguments(interaction.data?.options, {});
	const languageQueryRaw = languageOrUndefined ?? "";

	const languageQueryTrimmed = languageQueryRaw.trim();
	if (languageQueryTrimmed.length === 0) {
		const strings = {
			autocomplete: client.localise("autocomplete.language", locale)(),
		};

		respond(client, interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
		return;
	}

	const languageQueryLowercase = languageQueryTrimmed.toLowerCase();
	const choices = languages.languages.localisation
		.map((language) => {
			return {
				name: client.localise(localisations.languages[language], locale)(),
				value: language,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(languageQueryLowercase));

	respond(client, interaction, choices);
}

async function handleSetLanguage(client: Client, interaction: Logos.Interaction): Promise<void> {
	const localeBefore = interaction.locale;

	const [{ language: languageOrUndefined }] = parseArguments(interaction.data?.options, {});
	if (languageOrUndefined === undefined) {
		displayError(client, interaction, { locale: interaction.locale });
		return;
	}

	if (!isLocalisationLanguage(languageOrUndefined)) {
		displayError(client, interaction, { locale: interaction.locale });
		return;
	}

	const language = languageOrUndefined;

	await postponeReply(client, interaction);

	const session = client.database.openSession();

	const userDocument =
		client.documents.users.get(interaction.user.id.toString()) ??
		(await session.get<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined));

	if (userDocument === undefined) {
		return;
	}

	if (userDocument.account.language === language) {
		const strings = {
			title: client.localise("settings.strings.alreadySet.title", localeBefore)(),
			description: client.localise(
				"settings.strings.alreadySet.description",
				localeBefore,
			)({
				language: client.localise(localisations.languages[language], localeBefore)(),
			}),
		};

		editReply(client, interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		});

		return;
	}

	userDocument.account.language = language;
	await session.set(userDocument);
	await session.saveChanges();
	session.dispose();

	const localeAfter = getLocaleByLocalisationLanguage(language);

	const strings = {
		title: client.localise("settings.strings.languageUpdated.title", localeAfter)(),
		description: client.localise(
			"settings.strings.languageUpdated.description",
			localeAfter,
		)({
			language: client.localise(localisations.languages[language], localeAfter)(),
		}),
	};

	editReply(client, interaction, {
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
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("settings.strings.invalid.title", locale)(),
		description: client.localise("settings.strings.invalid.description", locale)(),
	};

	reply(client, interaction, {
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
