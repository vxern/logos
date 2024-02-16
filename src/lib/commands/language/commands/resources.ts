import * as Discord from "@discordeno/bot";
import localisations from "../../../../constants/localisations";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { Guild } from "../../../database/guild";
import { getShowButton, parseArguments } from "../../../interactions";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";

const command: CommandTemplate = {
	id: "resources",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleDisplayResources,
	options: [show],
	flags: {
		isShowable: true,
	},
};

/** Displays a message with information on where to find the resources for a given language. */
async function handleDisplayResources(client: Client, interaction: Logos.Interaction): Promise<void> {
	const [{ show: showParameter }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const show = interaction.show ?? showParameter ?? false;
	const locale = interaction.show ?? show ? interaction.guildLocale : interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.features.language.features?.resources;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const strings = {
		redirect: client.localise(
			"resources.strings.redirect",
			locale,
		)({
			language: client.localise(localisations.languages[interaction.featureLanguage], locale)(),
		}),
	};

	const showButton = getShowButton(client, interaction, { locale });

	const buttons: Discord.ButtonComponent[] = [
		{
			type: Discord.MessageComponentTypes.Button,
			label: strings.redirect,
			style: Discord.ButtonStyles.Link,
			url: configuration.url,
		},
	];

	if (!show) {
		buttons.push(showButton);
	}

	client.reply(
		interaction,
		{
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: buttons as [Discord.ButtonComponent],
				},
			],
		},
		{ visible: show },
	);
}

export default command;
