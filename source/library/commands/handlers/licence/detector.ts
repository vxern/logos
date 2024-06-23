import { getDetectorLicence, isValidLicensedDetector } from "logos:constants/licences";
import type { Client } from "logos/client";

async function handleDisplayDetectorLicenceAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { detector: string }>,
): Promise<void> {
	const detectorLowercase = interaction.parameters.detector.trim().toLowerCase();
	const choices = Object.entries(constants.licences.detectors)
		.map(([detectorKey, detector]) => {
			return {
				name: detector.name,
				value: detectorKey,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(detectorLowercase));

	await client.respond(interaction, choices);
}

async function handleDisplayDetectorLicence(
	client: Client,
	interaction: Logos.Interaction<any, { detector: string }>,
): Promise<void> {
	if (!isValidLicensedDetector(interaction.parameters.detector)) {
		await displayError(client, interaction);
		return;
	}

	const licence = getDetectorLicence(interaction.parameters.detector);

	const strings = constants.contexts.licence({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});

	await client.notice(interaction, {
		author: {
			name: strings.title({ entity: licence.name }),
			iconUrl: licence.faviconLink,
			url: licence.link,
		},
		description: licence.notices !== undefined ? `*${licence.notices.licence}*` : undefined,
		image: licence.notices?.badgeLink !== undefined ? { url: licence.notices.badgeLink } : undefined,
		fields: [
			{
				name: strings.fields.source,
				value: licence.link,
			},
			...(licence.notices?.copyright !== undefined
				? [
						{
							name: strings.fields.copyright,
							value: licence.notices.copyright,
						},
					]
				: []),
		],
	});
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

export { handleDisplayDetectorLicence, handleDisplayDetectorLicenceAutocomplete };
