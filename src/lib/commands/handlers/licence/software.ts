import { Locale } from "logos:constants/languages";
import { code } from "logos:core/formatting";
import { Client } from "logos/client";
import { SoftwareLicenceView } from "logos/commands/components/paginated-views/software-licence-view";

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
	const locale = interaction.locale;

	if (!(interaction.parameters.package in constants.licences.software)) {
		displayError(client, interaction, { locale: locale });
		return;
	}

	const packageName = interaction.parameters.package as keyof typeof constants.licences.software;

	const strings = {
		license: client.localise("license.strings.license", locale)({ entity: code(packageName) }),
	};

	const view = new SoftwareLicenceView(client, {
		interaction,
		title: strings.license,
		sections: Array.from(constants.licences.software[packageName]),
	});

	await view.open();
}

async function displayError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("license.strings.invalid.title", locale)(),
		description: client.localise("license.strings.invalid.description", locale)(),
	};

	await client.error(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

export { handleDisplaySoftwareLicence, handleDisplaySoftwareLicenceAutocomplete };
