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
import { parseArguments } from "../../../../../interactions";
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

		client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
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

	client.respond(interaction, choices);
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

	await client.postponeReply(interaction);

	const userDocument = await User.getOrCreate(client, { userId: interaction.user.id.toString() });
	if (userDocument.preferredLanguage === language) {
		const strings = {
			title: client.localise("settings.strings.alreadySet.title", localeBefore)(),
			description: client.localise(
				"settings.strings.alreadySet.description",
				localeBefore,
			)({
				language: client.localise(localisations.languages[language], localeBefore)(),
			}),
		};

		client.editReply(interaction, {
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

	await userDocument.update(client, () => {
		userDocument.preferredLanguage = language;
	});

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

	client.editReply(interaction, {
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

	client.reply(interaction, {
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
