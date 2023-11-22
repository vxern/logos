import * as Discord from "@discordeno/bot";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { getShowButton, parseArguments, reply } from "../../../interactions";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";
import { Guild } from "../../../database/guild";
import localisations from "../../../../constants/localisations";

const command: CommandTemplate = {
	name: "resources",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	isShowable: true,
	handle: handleDisplayResources,
	options: [show],
};

/** Displays a message with information on where to find the resources for a given language. */
async function handleDisplayResources(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ show: showParameter }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const show = interaction.show ?? showParameter ?? false;
	const locale = interaction.show ?? show ? interaction.guildLocale : interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const session = client.database.openSession();

	const guildDocument =
		client.cache.documents.guilds.get(guildId.toString()) ??
		(await session.load<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.language.features?.resources;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const strings = {
		redirect: localise(
			client,
			"resources.strings.redirect",
			locale,
		)({
			language: localise(client, localisations.languages[interaction.featureLanguage], locale)(),
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

	reply(
		[client, bot],
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
