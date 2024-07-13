import type { Client } from "logos/client";
import { User } from "logos/models/user";

async function handleClearLanguage(client: Client, interaction: Logos.Interaction): Promise<void> {
	await client.postponeReply(interaction);

	const userDocument = await User.getOrCreate(client, { userId: interaction.user.id.toString() });
	if (userDocument.preferredLanguage === undefined) {
		const strings = constants.contexts.cannotClearSettings({
			localise: client.localise,
			locale: interaction.locale,
		});
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
		const strings = constants.contexts.settingsCleared({
			localise: client.localise,
			locale: interaction.locale,
		});
		await client.succeeded(interaction, {
			title: strings.title,
			description: strings.description,
		});
	}
}

export { handleClearLanguage };
