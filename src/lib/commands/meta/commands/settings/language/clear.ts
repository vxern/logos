import constants from "../../../../../../constants/constants";
import * as Logos from "../../../../../../types";
import { Client, localise } from "../../../../../client";
import { editReply, postponeReply } from "../../../../../interactions";
import { OptionTemplate } from "../../../../command";
import * as Discord from "@discordeno/bot";

const command: OptionTemplate = {
	name: "clear",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleClearLanguage,
};

async function handleClearLanguage(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	await postponeReply([client, bot], interaction);

	const userDocument = await client.database.adapters.users.getOrFetch(client, "id", interaction.user.id.toString());
	if (userDocument === undefined) {
		return;
	}

	if (userDocument.data.account.language === undefined) {
		const strings = {
			title: localise(client, "settings.strings.cannotClear.title", locale)(),
			description: localise(client, "settings.strings.cannotClear.description", locale)(),
		};

		editReply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.yellow,
				},
			],
		});
		return;
	}

	await client.database.adapters.users.update(client, {
		...userDocument,
		data: {
			...userDocument.data,
			account: {
				...userDocument.data.account,
				// @ts-ignore: This is fine, just removing language.
				language: null,
			},
		},
	});

	{
		const strings = {
			title: localise(client, "settings.strings.cleared.title", locale)(),
			description: localise(client, "settings.strings.cleared.description", locale)(),
		};

		editReply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.lightGreen,
				},
			],
		});
	}
}

export default command;
