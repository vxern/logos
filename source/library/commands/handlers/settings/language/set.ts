import { getLocalisationLocaleByLanguage, isLocalisationLanguage } from "logos:constants/languages/localisation";
import type { Client } from "logos/client";
import { handleAutocompleteLanguage } from "logos/commands/fragments/autocomplete/language";
import { User } from "logos/models/user";

async function handleSetLanguageAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { language: string }>,
): Promise<void> {
	await handleAutocompleteLanguage(
		client,
		interaction,
		{ type: "localisation" },
		{ parameter: interaction.parameters.language },
	);
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

	await client.postponeReply(interaction);

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
