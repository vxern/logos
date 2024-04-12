import { Client } from "logos/client";
import { handleResumePlayback } from "logos/commands/handlers/music/resume";

async function handlePausePlayback(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.guildLocale;

	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(interaction);
	if (!isVoiceStateVerified) {
		return;
	}

	const isOccupied = musicService.isOccupied;
	if (!isOccupied) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.notPlaying.title", locale)(),
			description: {
				toManage: client.localise("music.strings.notPlaying.description.toManage", locale)(),
			},
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description.toManage,
		});

		return;
	}

	if (musicService.session.isPaused) {
		await handleResumePlayback(client, interaction);
		return;
	}

	musicService.session.setPaused(true);

	const strings = {
		title: client.localise("music.options.pause.strings.paused.title", locale)(),
		description: client.localise("music.options.pause.strings.paused.description", locale)(),
	};

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
