import { isCollection } from "logos:constants/music";
import { Client } from "logos/client";

async function handleReplayAction(
	client: Client,
	interaction: Logos.Interaction<any, { collection: boolean | undefined }>,
): Promise<void> {
	const locale = interaction.guildLocale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.getMusicService(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(interaction);
	if (!isVoiceStateVerified) {
		return;
	}

	const [current, isOccupied] = [musicService.current, musicService.isOccupied];
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

	if (interaction.parameters.collection) {
		if (current?.content === undefined || !isCollection(current.content)) {
			const locale = interaction.locale;
			const strings = {
				title: client.localise("music.options.replay.strings.noSongCollection.title", locale)(),
				description: {
					noSongCollection: client.localise(
						"music.options.replay.strings.noSongCollection.description.noSongCollection",
						locale,
					)(),
					trySongInstead: client.localise(
						"music.options.replay.strings.noSongCollection.description.trySongInstead",
						locale,
					)(),
				},
			};

			await client.warning(interaction, {
				title: strings.title,
				description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
			});

			return;
		}
	} else if (current?.content === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.replay.strings.noSong.title", locale)(),
			description: client.localise("music.options.replay.strings.noSong.description", locale)(),
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const strings = {
		title: client.localise("music.options.replay.strings.replaying.title", locale)(),
		description: client.localise("music.options.replay.strings.replaying.description", locale)(),
	};

	await client.success(
		interaction,
		{
			title: `${constants.emojis.music.replaying} ${strings.title}`,
			description: strings.description,
		},
		{ visible: true },
	);

	await musicService.replay(interaction.parameters.collection ?? false);
}

export { handleReplayAction };
