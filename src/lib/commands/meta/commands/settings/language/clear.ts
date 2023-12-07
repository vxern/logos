import * as Discord from "@discordeno/bot";
import constants from "../../../../../../constants/constants";
import * as Logos from "../../../../../../types";
import { Client, localise } from "../../../../../client";
import { User } from "../../../../../database/user";
import { editReply, postponeReply } from "../../../../../interactions";
import { OptionTemplate } from "../../../../command";

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

	let session = client.database.openSession();

	const userDocument =
		client.cache.documents.users.get(interaction.user.id.toString()) ??
		(await session.load<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined));

	session.dispose();

	if (userDocument === undefined) {
		return;
	}

	if (userDocument.account.language === undefined) {
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

	session = client.database.openSession();
	userDocument.account.language = undefined;
	await session.store(userDocument);
	await session.saveChanges();
	session.dispose();

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
