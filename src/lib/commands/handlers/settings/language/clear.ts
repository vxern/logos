import { Client } from "logos/client";
import { User } from "logos/database/user";

async function handleClearLanguage(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	await client.postponeReply(interaction);

	const userDocument = await User.getOrCreate(client, { userId: interaction.user.id.toString() });
	if (userDocument.preferredLanguage === undefined) {
		const strings = {
			title: client.localise("settings.strings.cannotClear.title", locale)(),
			description: client.localise("settings.strings.cannotClear.description", locale)(),
		};

		await client.warned(interaction, {
			title: strings.title,
			description: strings.description,
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

		await client.succeeded(interaction, {
			title: strings.title,
			description: strings.description,
		});
	}
}

export { handleClearLanguage };