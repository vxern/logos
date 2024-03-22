import { Client } from "../../../client";

async function handleDisplayAcknowledgements(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const strings = {
		acknowledgements: client.localise("acknowledgements.strings.acknowledgements", locale)(),
	};

	const fields = constants.acknowledgements.map<Discord.CamelizedDiscordEmbedField>((acknowledgement) => {
		const contributorsFormatted = acknowledgement.users.map((contributor) => contributor.username).join(", ");

		return {
			name: `${contributorsFormatted}:`,
			value: acknowledgement.reason,
			inline: false,
		};
	});

	await client.reply(interaction, {
		embeds: [
			{
				title: strings.acknowledgements,
				fields,
				color: constants.colours.blue,
			},
		],
	});
}

export { handleDisplayAcknowledgements };
