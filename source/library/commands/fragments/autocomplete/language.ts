import { trim } from "logos:core/formatting.ts";
import type { Client } from "logos/client.ts";
import { handleSimpleAutocomplete } from "logos/commands/fragments/autocomplete/simple.ts";

async function autocompleteLanguage(
	client: Client,
	interaction: Logos.Interaction<any, { language: string | undefined }>,
): Promise<void> {
	const strings = constants.contexts.autocompleteLanguage({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});

	if (interaction.parameters.language === undefined) {
		await client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
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
