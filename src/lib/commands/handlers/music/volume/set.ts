import { Client } from "logos/client";

async function handleSetVolume(client: Client, interaction: Logos.Interaction<any, { volume: number }>): Promise<void> {
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

	if (!Number.isSafeInteger(interaction.parameters.volume)) {
		return;
	}

	if (interaction.parameters.volume < 0 || interaction.parameters.volume > constants.MAXIMUM_VOLUME) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.volume.options.set.strings.invalid.title", locale)(),
			description: client.localise(
				"music.options.volume.options.set.strings.invalid.description",
				locale,
			)({ volume: constants.MAXIMUM_VOLUME }),
		};

		await client.error(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	musicService.setVolume(interaction.parameters.volume);

	const strings = {
		title: client.localise("music.options.volume.options.set.strings.set.title", locale)(),
		description: client.localise(
			"music.options.volume.options.set.strings.set.description",
			locale,
		)({ volume: interaction.parameters.volume }),
	};

	await client.success(
		interaction,
		{
			title: `${constants.emojis.music.volume} ${strings.title}`,
			description: strings.description,
		},
		{ visible: true },
	);
}

export { handleSetVolume };
