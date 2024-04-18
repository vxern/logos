import { Client } from "logos/client";

async function handleStopPlayback(client: Client, interaction: Logos.Interaction): Promise<void> {
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

	await musicService.stop();

	const strings = constants.contexts.stopped({ localise: client.localise, locale: interaction.guildLocale });

	await client.success(
		interaction,
		{
			title: `${constants.emojis.music.stopped} ${strings.title}`,
			description: strings.description,
		},
		{ visible: true },
	);
}

export { handleStopPlayback };
