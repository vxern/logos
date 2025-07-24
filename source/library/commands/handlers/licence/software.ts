import { code } from "rost:constants/formatting";
import { isValidLicensedSoftware } from "rost:constants/licences";
import type { Client } from "rost/client";
import { SoftwareLicenceView } from "rost/commands/components/paginated-views/software-licence-view";
import { handleSimpleAutocomplete } from "rost/commands/fragments/autocomplete/simple";

async function handleDisplaySoftwareLicenceAutocomplete(
	client: Client,
	interaction: Rost.Interaction<any, { package: string }>,
): Promise<void> {
	await handleSimpleAutocomplete(client, interaction, {
		query: interaction.parameters.package,
		elements: Object.keys(constants.licences.software),
		getOption: (identifier) => ({ name: identifier, value: identifier }),
	});
}

async function handleDisplaySoftwareLicence(
	client: Client,
	interaction: Rost.Interaction<any, { package: string }>,
): Promise<void> {
	if (!isValidLicensedSoftware(interaction.parameters.package)) {
		const strings = constants.contexts.invalidLicence({ localise: client.localise, locale: interaction.locale });
		client.error(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	const packageName = interaction.parameters.package;

	const strings = constants.contexts.licence({ localise: client.localise, locale: interaction.locale });

	const view = new SoftwareLicenceView(client, {
		interaction,
		title: strings.title({ entity: code(packageName) }),
		sections: Array.from(constants.licences.software[packageName]),
	});

	await view.open();
}

export { handleDisplaySoftwareLicence, handleDisplaySoftwareLicenceAutocomplete };
