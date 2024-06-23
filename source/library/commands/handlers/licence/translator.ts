import { getTranslatorLicence, isValidLicensedTranslator } from "logos:constants/licences";
import type { Client } from "logos/client";
import { handleSimpleAutocomplete } from "logos/commands/fragments/autocomplete/simple.ts";
import { handleDisplayLicence } from "logos/commands/fragments/licence.ts";

async function handleDisplayTranslatorLicenceAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { translator: string }>,
): Promise<void> {
	await handleSimpleAutocomplete(client, interaction, {
		query: interaction.parameters.translator,
		elements: Object.entries(constants.licences.translators),
		getOption: ([identifier, translator]) => ({ name: translator.name, value: identifier }),
	});
}

async function handleDisplayTranslatorLicence(
	client: Client,
	interaction: Logos.Interaction<any, { translator: string }>,
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
