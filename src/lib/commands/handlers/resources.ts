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
		redirect: client.localise(
			"resources.strings.redirect",
			interaction.parameters.show ? interaction.guildLocale : interaction.locale,
		)({
			language: client.localise(
				constants.localisations.languages[interaction.featureLanguage],
				interaction.parameters.show ? interaction.guildLocale : interaction.locale,
			)(),
		}),
	};

	const buttons: Discord.ButtonComponent[] = [
		{
			type: Discord.MessageComponentTypes.Button,
			label: strings.redirect,
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
