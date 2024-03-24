import languages, { Locale, getLocaleByLocalisationLanguage, isLocalisationLanguage } from "logos:constants/languages";
import { trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { User } from "logos/database/user";

async function handleSetLanguageAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { language: string }>,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const languageLowercase = interaction.parameters.language.trim().toLowerCase();
	if (languageLowercase.length === 0) {
		const strings = {
			autocomplete: client.localise("autocomplete.language", locale)(),
		};

		await client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
		return;
	}

	const choices = languages.languages.localisation
		.map((language) => {
			return {
				name: client.localise(constants.localisations.languages[language], locale)(),
				value: language,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(languageLowercase));

	await client.respond(interaction, choices);
}

async function handleSetLanguage(
	client: Client,
	interaction: Logos.Interaction<any, { language: string }>,
): Promise<void> {
	const localeBefore = interaction.locale;

	if (!isLocalisationLanguage(interaction.parameters.language)) {
		await displayError(client, interaction, { locale: interaction.locale });
		return;
	}

	const language = interaction.parameters.language;

	await client.postponeReply(interaction);

	const userDocument = await User.getOrCreate(client, { userId: interaction.user.id.toString() });
	if (userDocument.preferredLanguage === language) {
		const strings = {
			title: client.localise("settings.strings.alreadySet.title", localeBefore)(),
			description: client.localise(
				"settings.strings.alreadySet.description",
				localeBefore,
			)({
				language: client.localise(constants.localisations.languages[language], localeBefore)(),
			}),
		};

		await client.editReply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.blue,
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
			language: client.localise(constants.localisations.languages[language], localeAfter)(),
		}),
	};

	client.editReply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colours.lightGreen,
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

	await client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colours.red,
			},
		],
	});
}

export { handleSetLanguage, handleSetLanguageAutocomplete };
