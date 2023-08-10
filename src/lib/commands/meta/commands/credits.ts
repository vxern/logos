import { Client, localise } from "../../../client";
import { CommandTemplate } from "../../command";
import * as Discord from "discordeno";
import * as Logos from "../../../../types";
import constants from "../../../../constants/constants";
import { chunk } from "../../../utils";
import { Locale } from "../../../../constants/languages";
import { reply } from "../../../interactions";

const command: CommandTemplate = {
	name: "credits",
	type: Discord.ApplicationCommandTypes.ChatInput,
	handle: handleDisplayCredits,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
};

async function handleDisplayCredits(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	reply([client, bot], interaction, { embeds: [getTranslationView(client, locale)] });
}

function getTranslationView(client: Client, locale: Locale): Discord.Embed {
	const fields: Discord.EmbedField[] = [];

	for (const [language, data] of Object.entries(constants.contributions.translation)) {
		const contributorsFormatted = chunk(
			data.contributors.map((contributor) => {
				if ("link" in contributor) {
					return `**[${contributor.username}](${contributor.link})**`;
				}

				return `**${contributor.username}**`;
			}),
			3,
		)
			.map((chunks) => chunks.join(" "))
			.join("\n");

		fields.push({
			name: `${data.flag} ${language}`,
			value: contributorsFormatted,
			inline: true,
		});
	}

	const strings = {
		translation: localise(client, "credits.strings.translation", locale)(),
	};

	return { title: strings.translation, fields, color: constants.colors.blue };
}

export default command;
