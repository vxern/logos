import { Locale } from "../../../../../constants/languages";
import { code } from "../../../../../formatting";
import { Client } from "../../../../client";
import { PaginatedSoftwareLicenceViewComponent } from "../../../../components/paginated-view";

async function handleDisplaySoftwareLicenceAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { package: string }>,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

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

	const viewComponent = new PaginatedSoftwareLicenceViewComponent(client, {
		interaction,
		title: strings.license,
		sections: Array.from(constants.licences.software[packageName]),
	});

	await viewComponent.open();
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

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colours.red,
			},
		],
	});
}

export { handleDisplaySoftwareLicence, handleDisplaySoftwareLicenceAutocomplete };
