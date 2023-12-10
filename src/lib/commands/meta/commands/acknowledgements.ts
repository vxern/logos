import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { reply } from "../../../interactions";
import { CommandTemplate } from "../../command";
import acknowledgements from "../../../../constants/types/acknowledgements";

const command: CommandTemplate = {
	name: "acknowledgements",
	type: Discord.ApplicationCommandTypes.ChatInput,
	handle: handleDisplayAcknowledgements,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
};

async function handleDisplayAcknowledgements(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const strings = {
		acknowledgements: localise(client, "acknowledgements.strings.acknowledgements", locale)(),
	};

	const fields = acknowledgements.map<Discord.CamelizedDiscordEmbedField>((acknowledgement) => {
		const contributorsFormatted = acknowledgement.users.map((contributor) => contributor.username).join(", ");

		return {
			name: `${contributorsFormatted}:`,
			value: acknowledgement.reason,
			inline: false,
		};
	});

	reply([client, bot], interaction, {
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
