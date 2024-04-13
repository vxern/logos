import { Client } from "logos/client";

async function handleDisplayVolume(
	client: Client,
	interaction: Logos.Interaction<any, { show: boolean | undefined }>,
): Promise<void> {
	const locale = interaction.parameters.show ? interaction.guildLocale : interaction.locale;

	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canCheckPlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.notPlaying.title", locale)(),
			description: {
				toCheck: client.localise("music.strings.notPlaying.description.toCheck", locale)(),
			},
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description.toCheck,
		});

		return;
	}

	const strings = {
		title: client.localise("music.options.volume.options.display.strings.volume.title", locale)(),
		description: client.localise(
			"music.options.volume.options.display.strings.volume.description",
			locale,
		)({ volume: musicService.session.player.volume }),
	};

	const components: Discord.ActionRow[] | undefined = interaction.parameters.show
		? undefined
		: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [client.interactionRepetitionService.getShowButton(interaction, { locale })],
				},
		  ];

	await client.notice(
		interaction,
		{
			embeds: [
				{
					title: `${constants.emojis.music.volume} ${strings.title}`,
					description: strings.description,
				},
			],
			components,
		},
		{ visible: interaction.parameters.show },
	);
}

export { handleDisplayVolume };
