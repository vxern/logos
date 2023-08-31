import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { parseArguments, reply } from "../../../interactions";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";
import * as Discord from "@discordeno/bot";

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
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ show }] = parseArguments(interaction.data?.options, { show: "boolean" });
	const locale = show ? interaction.guildLocale : interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetchOrCreate(
		client,
		"id",
		guildId.toString(),
		guildId,
	);
	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.data.features.language.features?.resources;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const strings = {
		redirect: localise(
			client,
			"resources.strings.redirect",
			locale,
		)({
			language: localise(client, `languages.${interaction.featureLanguage.toLowerCase()}`, locale)(),
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
							url: configuration.url,
						},
					],
				},
			],
		},
		{ visible: show },
	);
}

export default command;
