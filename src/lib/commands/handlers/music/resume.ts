import { Client } from "logos/client";

async function handleResumePlayback(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.guildLocale;

	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(interaction);
	if (!isVoiceStateVerified) {
		return;
	}

	if (!musicService.hasSession) {
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

	if (!musicService.session.player.paused) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.resume.strings.notPaused.title", locale)(),
			description: client.localise("music.options.resume.strings.notPaused.description", locale)(),
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	musicService.session.setPaused(false);

	const strings = {
		title: client.localise("music.options.resume.strings.resumed.title", locale)(),
		description: client.localise("music.options.resume.strings.resumed.description", locale)(),
	};

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
