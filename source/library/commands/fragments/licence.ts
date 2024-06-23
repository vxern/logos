import type { Licence } from "logos:constants/licences.ts";
import type { Client } from "logos/client.ts";

async function handleDisplayLicence(
	client: Client,
	interaction: Logos.Interaction,
	{ identifier, getLicence }: { identifier: string; getLicence: (identifier: string) => Licence | undefined },
) {
	const licence = getLicence(identifier);
	if (licence === undefined) {
		await displayError(client, interaction);
		return;
	}

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

export { handleDisplayLicence };
