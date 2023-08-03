import constants from "../../../../constants/constants";
import defaults from "../../../../defaults";
import { Client, localise } from "../../../client";
import { parseArguments, reply } from "../../../interactions";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "resources",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleDisplayResources,
	options: [show],
};

/** Displays a message with information on where to find the resources for a given language. */
async function handleDisplayResources(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ show }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetch(client, "id", guildId.toString());
	if (guildDocument === undefined) {
		return;
	}

	const locale = show ? defaults.LOCALISATION_LOCALE : interaction.locale;
	const featureLanguage = guildDocument.data.languages?.feature ?? defaults.FEATURE_LANGUAGE;

	const strings = {
		redirect: localise(
			client,
			"resources.strings.redirect",
			locale,
		)({
			language: localise(client, `languages.${featureLanguage.toLowerCase()}`, locale)(),
		}),
	};

	reply(
		[client, bot],
		interaction,
		{
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							label: strings.redirect,
							style: Discord.ButtonStyles.Link,
							url: constants.links.generateLanguageRepositoryLink(featureLanguage),
						},
					],
				},
			],
		},
		{ visible: show },
	);
}

export default command;
