import { trim } from "logos:constants/formatting";
import type { Client } from "logos/client";
import { handleSimpleAutocomplete } from "logos/commands/fragments/autocomplete/simple";

type LanguageType = keyof typeof constants.languages.languages;
async function handleAutocompleteLanguage(
	client: Client,
	interaction: Logos.Interaction<any, any>,
	{ type }: { type: LanguageType },
	{ parameter }: { parameter: string | undefined },
): Promise<void> {
	const strings = constants.contexts.autocompleteLanguage({ localise: client.localise, locale: interaction.locale });

	if (parameter === undefined) {
		client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]).ignore();
		return;
	}

	await handleSimpleAutocomplete(client, interaction, {
		query: parameter,
		elements: constants.languages.languages[type],
		getOption: (language) => {
			const languageFlag = constants.emojis.flags[language];
			const languageName = client.localise(constants.localisations.languages[language], interaction.locale)();

			return { name: `${languageFlag} ${languageName}`, value: language };
		},
	});
}

export { handleAutocompleteLanguage };
