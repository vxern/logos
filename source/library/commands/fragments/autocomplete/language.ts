import { trim } from "logos:constants/formatting";
import type { Client } from "logos/client";
import { handleSimpleAutocomplete } from "logos/commands/fragments/autocomplete/simple";

async function autocompleteLanguage(
	client: Client,
	interaction: Logos.Interaction<any, { language: string | undefined }>,
): Promise<void> {
	const strings = constants.contexts.autocompleteLanguage({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});

	if (interaction.parameters.language === undefined) {
		client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]).ignore();
		return;
	}

	await handleSimpleAutocomplete(client, interaction, {
		query: interaction.parameters.language,
		elements: constants.languages.languages.localisation,
		getOption: (language) => ({
			name: client.localise(constants.localisations.languages[language], interaction.locale)(),
			value: language,
		}),
	});
}

export { autocompleteLanguage };
