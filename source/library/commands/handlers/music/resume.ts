import type { Client } from "logos/client";

async function handleResumePlayback(client: Client, interaction: Logos.Interaction): Promise<void> {
	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canManagePlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const strings = constants.contexts.notPlayingMusicToManage({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (!musicService.session.player.paused) {
		const strings = constants.contexts.notPaused({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	await musicService.session.setPaused(false);

	const strings = constants.contexts.resumed({
		localise: client.localise.bind(client),
		locale: interaction.guildLocale,
	});

	await client.success(
		interaction,
		{
			title: `${constants.emojis.music.resumed} ${strings.title}`,
			description: strings.description,
		},
		{ visible: true },
	);
}

export { handleResumePlayback };
