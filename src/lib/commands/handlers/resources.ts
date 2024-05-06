import { Client } from "logos/client";
import { Guild } from "logos/database/guild";

/** Displays a message with information on where to find the resources for a given language. */
async function handleDisplayResources(client: Client, interaction: Logos.Interaction): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.resources;
	if (configuration === undefined) {
		return;
	}

	const strings = {
		...constants.contexts.redirect({
			localise: client.localise.bind(client),
			locale: interaction.parameters.show ? interaction.guildLocale : interaction.locale,
		}),
		...constants.contexts.language({
			localise: client.localise.bind(client),
			locale: interaction.parameters.show ? interaction.guildLocale : interaction.locale,
		}),
	};

	const buttons: Discord.ButtonComponent[] = [
		{
			type: Discord.MessageComponentTypes.Button,
			label: strings.redirect({ language: strings.language(interaction.featureLanguage) }),
			style: Discord.ButtonStyles.Link,
			url: configuration.url,
		},
	];

	if (!interaction.parameters.show) {
		buttons.push(client.interactionRepetitionService.getShowButton(interaction));
	}

	await client.reply(
		interaction,
		{
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: buttons as [Discord.ButtonComponent],
				},
			],
		},
		{ visible: interaction.parameters.show },
	);
}

export { handleDisplayResources };
