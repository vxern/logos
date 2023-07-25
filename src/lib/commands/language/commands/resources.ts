import constants from "../../../../constants/constants";
import { defaultLocale } from "../../../../types";
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

	const locale = show ? defaultLocale : interaction.locale;

	const strings = {
		redirect: localise(
			client,
			"resources.strings.redirect",
			locale,
		)({
			language: localise(client, `languages.${guildDocument.data.language.toLowerCase()}`, locale)(),
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
							url: constants.links.generateLanguageRepositoryLink(guildDocument.data.language),
						},
					],
				},
			],
		},
		{ visible: show },
	);
}

export default command;
