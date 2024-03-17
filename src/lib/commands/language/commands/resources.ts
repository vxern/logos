import { Client } from "../../../client";
import { Guild } from "../../../database/guild";

/** Displays a message with information on where to find the resources for a given language. */
async function handleDisplayResources(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.parameters.show ? interaction.guildLocale : interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.resources;
	if (configuration === undefined) {
		return;
	}

	const strings = {
		redirect: client.localise(
			"resources.strings.redirect",
			locale,
		)({
			language: client.localise(constants.localisations.languages[interaction.featureLanguage], locale)(),
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
		buttons.push(client.interactionRepetitionService.getShowButton(interaction, { locale }));
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
		{ visible: interaction.parameters.show },
	);
}

export { handleDisplayResources };
