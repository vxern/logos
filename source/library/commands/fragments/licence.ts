import type { Licence } from "logos:constants/licences";
import type { Client } from "logos/client";

async function handleDisplayLicence(
	client: Client,
	interaction: Logos.Interaction,
	{ identifier, getLicence }: { identifier: string; getLicence: (identifier: string) => Licence | undefined },
) {
	const licence = getLicence(identifier);
	if (licence === undefined) {
		const strings = constants.contexts.invalidLicence({ localise: client.localise, locale: interaction.locale });
		client.error(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	const strings = constants.contexts.licence({ localise: client.localise, locale: interaction.locale });

	client
		.notice(interaction, {
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
		})
		.ignore();
}

export { handleDisplayLicence };
