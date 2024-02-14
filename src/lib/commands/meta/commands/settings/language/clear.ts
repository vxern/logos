import * as Discord from "@discordeno/bot";
import constants from "../../../../../../constants/constants";
import * as Logos from "../../../../../../types";
import { Client } from "../../../../../client";
import { User } from "../../../../../database/user";
import { OptionTemplate } from "../../../../command";

const command: OptionTemplate = {
	id: "clear",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleClearLanguage,
};

async function handleClearLanguage(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	await client.postponeReply(interaction);

	let session = client.database.openSession();

	const userDocument =
		client.documents.users.get(interaction.user.id.toString()) ??
		(await session.get<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined));

	session.dispose();

	if (userDocument === undefined) {
		return;
	}

	if (userDocument.account.language === undefined) {
		const strings = {
			title: client.localise("settings.strings.cannotClear.title", locale)(),
			description: client.localise("settings.strings.cannotClear.description", locale)(),
		};

		client.editReply(interaction, {
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

	session = client.database.openSession();
	userDocument.account.language = undefined;
	await session.set(userDocument);
	await session.saveChanges();
	session.dispose();

	{
		const strings = {
			title: client.localise("settings.strings.cleared.title", locale)(),
			description: client.localise("settings.strings.cleared.description", locale)(),
		};

		client.editReply(interaction, {
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
