import { getDetectorLicence, isValidLicensedDetector } from "logos:constants/licences";
import type { Client } from "logos/client";
import { handleSimpleAutocomplete } from "logos/commands/fragments/autocomplete/simple.ts";
import { handleDisplayLicence } from "logos/commands/fragments/licence.ts";

async function handleDisplayDetectorLicenceAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { detector: string }>,
): Promise<void> {
	await handleSimpleAutocomplete(client, interaction, {
		query: interaction.parameters.detector,
		elements: Object.entries(constants.licences.detectors),
		getOption: ([identifier, detector]) => ({ name: detector.name, value: identifier }),
	});
}

async function handleDisplayDetectorLicence(
	client: Client,
	interaction: Logos.Interaction<any, { detector: string }>,
): Promise<void> {
	await handleDisplayLicence(client, interaction, {
		identifier: interaction.parameters.detector,
		getLicence: (identifier) => {
			if (!isValidLicensedDetector(identifier)) {
				return undefined;
			}

			return getDetectorLicence(identifier);
		},
	});
}

export { handleDisplayDetectorLicence, handleDisplayDetectorLicenceAutocomplete };
