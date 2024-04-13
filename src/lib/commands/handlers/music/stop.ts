import { Client } from "logos/client";

async function handleStopPlayback(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.guildLocale;

	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(interaction);
	if (!isVoiceStateVerified) {
		return;
	}

	const isOccupied = musicService.hasActiveSession;
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

	await musicService.stop();

	const strings = {
		title: client.localise("music.options.stop.strings.stopped.title", locale)(),
		description: client.localise("music.options.stop.strings.stopped.description", locale)(),
	};

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
