import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import localisations from "../../../../../constants/localisations";
import defaults from "../../../../../defaults";
import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { User } from "../../../../database/user";
import { OptionTemplate } from "../../../command";

const command: OptionTemplate = {
	id: "view",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplaySettings,
};

async function handleDisplaySettings(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const session = client.database.openSession();

	const userDocument =
		client.documents.users.get(interaction.user.id.toString()) ??
		(await session.get<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined));

	session.dispose();

	if (userDocument === undefined) {
		return;
	}

	const userLanguage = userDocument.account.language ?? defaults.LOCALISATION_LANGUAGE;

	const strings = {
		title: client.localise("settings.strings.settings.title", locale)(),
		description: {
			language: {
				title: client.localise("settings.strings.settings.fields.language.title", locale)(),
				noLanguageSet: client.localise(
					"settings.strings.settings.fields.language.description.noLanguageSet.noLanguageSet",
					locale,
				)(),
				defaultShown: client.localise(
					"settings.strings.settings.fields.language.description.noLanguageSet.defaultShown",
					locale,
				)(),
				language: client.localise(localisations.languages[userLanguage], locale)(),
			},
		},
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				color: constants.colors.blue,
				fields: [
					{
						name: strings.description.language.title,
						value:
							userDocument.account.language !== undefined
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
