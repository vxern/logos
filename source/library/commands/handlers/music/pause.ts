import type { Client } from "logos/client";
import { handleResumePlayback } from "logos/commands/handlers/music/resume";

async function handlePausePlayback(client: Client, interaction: Logos.Interaction): Promise<void> {
	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canManagePlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const strings = constants.contexts.notPlayingMusicToManage({
			localise: client.localise,
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (musicService.session.player.paused) {
		await handleResumePlayback(client, interaction);
		return;
	}

	await musicService.session.setPaused(true);

	const strings = constants.contexts.musicPaused({
		localise: client.localise,
		locale: interaction.guildLocale,
	});

	await client.notice(
		interaction,
		{
			title: `${constants.emojis.music.paused} ${strings.title}`,
			description: strings.description,
		},
		{ visible: true },
	);
}

export { handlePausePlayback };
