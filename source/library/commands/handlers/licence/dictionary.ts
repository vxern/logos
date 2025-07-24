import { getDictionaryLicence, isValidLicensedDictionary } from "rost:constants/licences";
import type { Client } from "rost/client";
import { handleSimpleAutocomplete } from "rost/commands/fragments/autocomplete/simple";
import { handleDisplayLicence } from "rost/commands/fragments/licence";

async function handleDisplayDictionaryLicenceAutocomplete(
	client: Client,
	interaction: Rost.Interaction<any, { dictionary: string }>,
): Promise<void> {
	await handleSimpleAutocomplete(client, interaction, {
		query: interaction.parameters.dictionary,
		elements: Object.entries(constants.licences.dictionaries),
		getOption: ([identifier, dictionary]) => ({ name: dictionary.name, value: identifier }),
	});
}

async function handleDisplayDictionaryLicence(
	client: Client,
	interaction: Rost.Interaction<any, { dictionary: string }>,
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
