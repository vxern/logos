import languages, { getLocaleByLocalisationLanguage, isLocalisationLanguage } from "logos:constants/languages";
import { trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { User } from "logos/database/user";

async function handleSetLanguageAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { language: string }>,
): Promise<void> {
	const languageLowercase = interaction.parameters.language.trim().toLowerCase();
	if (languageLowercase.length === 0) {
		const strings = constants.contexts.autocompleteLanguage({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});
		await client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
		return;
	}

	const strings = constants.contexts.language({ localise: client.localise.bind(client), locale: interaction.locale });
	const choices = languages.languages.localisation
		.map((language) => ({ name: strings.language(language), value: language }))
		.filter((choice) => choice.name.toLowerCase().includes(languageLowercase));

	await client.respond(interaction, choices);
}

async function handleSetLanguage(
	client: Client,
	interaction: Logos.Interaction<any, { language: string }>,
): Promise<void> {
	if (!isLocalisationLanguage(interaction.parameters.language)) {
		await displayError(client, interaction);
		return;
	}

	const language = interaction.parameters.language;

	await client.postponeReply(interaction);

	const userDocument = await User.getOrCreate(client, { userId: interaction.user.id.toString() });
	if (userDocument.preferredLanguage === language) {
		const strings = {
			...constants.contexts.languageAlreadySet({
				localise: client.localise.bind(client),
				locale: interaction.locale,
			}),
			...constants.contexts.language({ localise: client.localise.bind(client), locale: interaction.locale }),
		};
		await client.warned(interaction, {
			title: strings.title,
			description: strings.description({ language: strings.language(language) }),
		});

		return;
	}

	await userDocument.update(client, () => {
		userDocument.preferredLanguage = language;
	});

	const newLocale = getLocaleByLocalisationLanguage(language);
	const strings = {
		...constants.contexts.languageUpdated({ localise: client.localise.bind(client), locale: newLocale }),
		...constants.contexts.language({ localise: client.localise.bind(client), locale: newLocale }),
	};
	await client.succeeded(interaction, {
		title: strings.title,
		description: strings.description({ language: strings.language(language) }),
	});
}

async function displayError(client: Client, interaction: Logos.Interaction): Promise<void> {
	const strings = constants.contexts.languageInvalid({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});
	await client.error(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

export { handleSetLanguage, handleSetLanguageAutocomplete };
