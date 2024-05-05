import { Client } from "logos/client";

async function handleDisplayVolume(
	client: Client,
	interaction: Logos.Interaction<any, { show: boolean | undefined }>,
): Promise<void> {
	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canCheckPlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const strings = constants.contexts.notPlayingMusicToCheck({
			localise: client.localise,
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const strings = constants.contexts.volume({
		localise: client.localise,
		locale: interaction.parameters.show ? interaction.guildLocale : interaction.locale,
	});

	const components: Discord.ActionRow[] | undefined = interaction.parameters.show
		? undefined
		: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [client.interactionRepetitionService.getShowButton(interaction)],
				},
		  ];

	await client.notice(
		interaction,
		{
			embeds: [
				{
					title: `${constants.emojis.music.volume} ${strings.title}`,
					description: strings.description({ volume: musicService.session.player.volume }),
				},
			],
			components,
		},
		{ visible: interaction.parameters.show },
	);
}

export { handleDisplayVolume };
