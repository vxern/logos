import type { Client } from "logos/client";

async function handleDisplayAcknowledgements(client: Client, interaction: Logos.Interaction): Promise<void> {
	const fields = constants.acknowledgements.map<Discord.CamelizedDiscordEmbedField>((acknowledgement) => {
		const contributorsFormatted = acknowledgement.users.map((contributor) => contributor.username).join(", ");

		return {
			name: `${contributorsFormatted}:`,
			value: acknowledgement.reason,
			inline: false,
		};
	});

	const strings = constants.contexts.acknowledgements({ localise: client.localise, locale: interaction.locale });
	await client.notice(interaction, {
		title: strings.acknowledgements,
		fields,
	});
}

export { handleDisplayAcknowledgements };
