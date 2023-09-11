import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import localisations from "../../../../../constants/localisations";
import defaults from "../../../../../defaults";
import * as Logos from "../../../../../types";
import { Client, localise } from "../../../../client";
import { reply } from "../../../../interactions";
import { OptionTemplate } from "../../../command";

const command: OptionTemplate = {
	name: "view",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplaySettings,
};

async function handleDisplaySettings(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const userDocument = await client.database.adapters.users.getOrFetch(client, "id", interaction.user.id.toString());
	if (userDocument === undefined) {
		return;
	}

	const userLanguage = userDocument.data.account.language ?? defaults.LOCALISATION_LANGUAGE;

	const strings = {
		title: localise(client, "settings.strings.settings.title", locale)(),
		description: {
			language: {
				title: localise(client, "settings.strings.settings.fields.language.title", locale)(),
				noLanguageSet: localise(
					client,
					"settings.strings.settings.fields.language.description.noLanguageSet.noLanguageSet",
					locale,
				)(),
				defaultShown: localise(
					client,
					"settings.strings.settings.fields.language.description.noLanguageSet.defaultShown",
					locale,
				)(),
				language: localise(client, localisations.languages[userLanguage], locale)(),
			},
		},
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				color: constants.colors.blue,
				fields: [
					{
						name: strings.description.language.title,
						value:
							userDocument.data.account.language !== undefined
								? strings.description.language.language
								: `${strings.description.language.noLanguageSet} ${strings.description.language.defaultShown}`,
						inline: true,
					},
				],
			},
		],
	});
}

export default command;
