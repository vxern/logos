import { getTranslatorLicence, isValidLicensedTranslator } from "rost:constants/licences";
import type { Client } from "rost/client";
import { handleSimpleAutocomplete } from "rost/commands/fragments/autocomplete/simple";
import { handleDisplayLicence } from "rost/commands/fragments/licence";

async function handleDisplayTranslatorLicenceAutocomplete(
	client: Client,
	interaction: Rost.Interaction<any, { translator: string }>,
): Promise<void> {
	await handleSimpleAutocomplete(client, interaction, {
		query: interaction.parameters.translator,
		elements: Object.entries(constants.licences.translators),
		getOption: ([identifier, translator]) => ({ name: translator.name, value: identifier }),
	});
}

async function handleDisplayTranslatorLicence(
	client: Client,
	interaction: Rost.Interaction<any, { translator: string }>,
): Promise<void> {
	await handleDisplayLicence(client, interaction, {
		identifier: interaction.parameters.translator,
		getLicence: (identifier) => {
			if (!isValidLicensedTranslator(identifier)) {
				return undefined;
			}

			return getTranslatorLicence(identifier);
		},
	});
}

export { handleDisplayTranslatorLicence, handleDisplayTranslatorLicenceAutocomplete };
