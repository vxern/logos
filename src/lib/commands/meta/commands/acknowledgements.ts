import constants from "../../../../constants/constants";
import { Client } from "../../../client";
import { CommandTemplate } from "../../command";

const command: CommandTemplate = {
	id: "acknowledgements",
	type: Discord.ApplicationCommandTypes.ChatInput,
	handle: handleDisplayAcknowledgements,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
};

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

	client.reply(interaction, {
		embeds: [
			{
				title: strings.acknowledgements,
				fields,
				color: constants.colors.blue,
			},
		],
	});
}

export default command;
