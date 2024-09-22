import { trim } from "logos:constants/formatting";
import languages from "logos:constants/languages";
import { getLocalisationLocaleByLanguage, isLocalisationLanguage } from "logos:constants/languages/localisation";
import type { Client } from "logos/client";
import { User } from "logos/models/user";

async function handleSetLanguageAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { language: string }>,
): Promise<void> {
	const languageLowercase = interaction.parameters.language.trim().toLowerCase();
	if (languageLowercase.length === 0) {
		const strings = constants.contexts.autocompleteLanguage({
			localise: client.localise,
			locale: interaction.locale,
		});
		client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]).ignore();

		return;
	}

	const strings = constants.contexts.language({ localise: client.localise, locale: interaction.locale });
	const choices = languages.languages.localisation
		.map((language) => ({ name: strings.language(language), value: language }))
		.filter((choice) => choice.name.toLowerCase().includes(languageLowercase));

	client.respond(interaction, choices).ignore();
}

async function handleSetLanguage(
	client: Client,
	interaction: Logos.Interaction<any, { language: string }>,
): Promise<void> {
	if (!isLocalisationLanguage(interaction.parameters.language)) {
		const strings = constants.contexts.languageInvalid({ localise: client.localise, locale: interaction.locale });
		client.error(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	const language = interaction.parameters.language;

	client.postponeReply(interaction).ignore();

	const userDocument = await User.getOrCreate(client, { userId: interaction.user.id.toString() });
	if (userDocument.preferredLanguage === language) {
		const strings = {
			...constants.contexts.languageAlreadySet({ localise: client.localise, locale: interaction.locale }),
			...constants.contexts.language({ localise: client.localise, locale: interaction.locale }),
		};
		client
			.warned(interaction, {
				title: strings.title,
				description: strings.description({ language: strings.language(language) }),
			})
			.ignore();

		return;
	}

	await userDocument.update(client, () => {
		userDocument.preferredLanguage = language;
	});

	const newLocale = getLocalisationLocaleByLanguage(language);
	const strings = {
		...constants.contexts.languageUpdated({ localise: client.localise, locale: newLocale }),
		...constants.contexts.language({ localise: client.localise, locale: newLocale }),
	};
	client
		.succeeded(interaction, {
			title: strings.title,
			description: strings.description({ language: strings.language(language) }),
		})
		.ignore();
}

export { handleSetLanguage, handleSetLanguageAutocomplete };
