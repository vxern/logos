import { getDictionaryLicence, isValidLicensedDictionary } from "logos:constants/licences";
import type { Client } from "logos/client";
import { handleSimpleAutocomplete } from "logos/commands/fragments/autocomplete/simple.ts";
import { handleDisplayLicence } from "logos/commands/fragments/licence.ts";

async function handleDisplayDictionaryLicenceAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { dictionary: string }>,
): Promise<void> {
	await handleSimpleAutocomplete(client, interaction, {
		query: interaction.parameters.dictionary,
		elements: Object.entries(constants.licences.dictionaries),
		getOption: ([identifier, dictionary]) => ({ name: dictionary.name, value: identifier }),
	});
}

async function handleDisplayDictionaryLicence(
	client: Client,
	interaction: Logos.Interaction<any, { dictionary: string }>,
): Promise<void> {
	await handleDisplayLicence(client, interaction, {
		identifier: interaction.parameters.dictionary,
		getLicence: (identifier) => {
			if (!isValidLicensedDictionary(identifier)) {
				return undefined;
			}

			return getDictionaryLicence(identifier);
		},
	});
}

export { handleDisplayDictionaryLicence, handleDisplayDictionaryLicenceAutocomplete };
