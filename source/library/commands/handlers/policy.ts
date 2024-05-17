import type { Client } from "logos/client";
import { Guild } from "logos/database/guild";

async function handleDisplayModerationPolicy(client: Client, interaction: Logos.Interaction): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.policy;
	if (configuration === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	const components: Discord.ActionRow[] | undefined = interaction.parameters.show
		? undefined
		: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [client.interactionRepetitionService.getShowButton(interaction)],
				},
		  ];

	const strings = constants.contexts.moderationPolicy({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});
	await client.notice(
		interaction,
		{
			embeds: [
				{
					title: strings.title,
					fields: [
						{
							name: strings.points.introduction.title,
							value: strings.points.introduction.description,
						},
						{
							name: strings.points.breach.title,
							value: strings.points.breach.description,
						},
						{
							name: strings.points.warnings.title,
							value: strings.points.warnings.description,
						},
						{
							name: strings.points.furtherAction.title,
							value: strings.points.furtherAction.description,
						},
						{
							name: strings.points.ban.title,
							value: strings.points.ban.description,
						},
					],
				},
			],
			components,
		},
		{ visible: interaction.parameters.show },
	);
}

export { handleDisplayModerationPolicy };
