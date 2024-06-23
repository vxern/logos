import { code } from "logos:core/formatting";
import type { Client } from "logos/client";
import { SoftwareLicenceView } from "logos/commands/components/paginated-views/software-licence-view";
import { isValidLicensedSoftware } from "logos:constants/licences.ts";

async function handleDisplaySoftwareLicenceAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { package: string }>,
): Promise<void> {
	const packageLowercase = interaction.parameters.package.trim().toLowerCase();
	const choices = Object.keys(constants.licences.software)
		.map((packageName) => {
			return {
				name: packageName,
				value: packageName,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(packageLowercase));

	await client.respond(interaction, choices);
}

async function handleDisplaySoftwareLicence(
	client: Client,
	interaction: Logos.Interaction<any, { package: string }>,
): Promise<void> {
	if (!isValidLicensedSoftware(interaction.parameters.package)) {
		await displayError(client, interaction);
		return;
	}

	const packageName = interaction.parameters.package;

	const strings = constants.contexts.licence({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});

	const view = new SoftwareLicenceView(client, {
		interaction,
		title: strings.title({ entity: code(packageName) }),
		sections: Array.from(constants.licences.software[packageName]),
	});

	await view.open();
}

async function displayError(client: Client, interaction: Logos.Interaction): Promise<void> {
	const strings = constants.contexts.invalidLicence({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});

	await client.error(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

export { handleDisplaySoftwareLicence, handleDisplaySoftwareLicenceAutocomplete };
