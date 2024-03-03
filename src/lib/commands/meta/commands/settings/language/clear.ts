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

	const userDocument = await User.getOrCreate(client, { userId: interaction.user.id.toString() });
	if (userDocument.preferredLanguage === undefined) {
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

	await userDocument.update(client, () => {
		userDocument.preferredLanguage = undefined;
	});

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
