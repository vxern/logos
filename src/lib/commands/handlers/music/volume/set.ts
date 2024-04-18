import { Client } from "logos/client";

async function handleSetVolume(client: Client, interaction: Logos.Interaction<any, { volume: number }>): Promise<void> {
	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canManagePlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const strings = constants.contexts.notPlayingMusicToManage({ localise: client.localise, locale: interaction.locale });

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (!Number.isSafeInteger(interaction.parameters.volume)) {
		return;
	}

	if (interaction.parameters.volume < 0 || interaction.parameters.volume > constants.MAXIMUM_VOLUME) {
		const strings = constants.contexts.volumeInvalid({ localise: client.localise, locale: interaction.locale })

		await client.error(interaction, {title: strings.title, description: strings.description({ volume: constants.MAXIMUM_VOLUME }),});

		return;
	}

	await musicService.session.setVolume(interaction.parameters.volume);

	const strings = constants.contexts.volumeSet({ localise: client.localise, locale: interaction.locale });

	await client.success(
		interaction,
		{
			title: `${constants.emojis.music.volume} ${strings.title}`,
			description: strings.description({ volume: interaction.parameters.volume }),
		},
		{ visible: true },
	);
}

export { handleSetVolume };
