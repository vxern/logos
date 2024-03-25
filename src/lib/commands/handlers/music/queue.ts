import { Client } from "logos/client";
import { SongListingView } from "logos/commands/components/paginated-views/song-listing-view";

async function handleDisplayPlaybackQueue(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.parameters.show ? interaction.guildLocale : interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.getMusicService(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyVoiceState(interaction, "check");
	if (!isVoiceStateVerified) {
		return;
	}

	const isOccupied = musicService.isOccupied;
	if (!isOccupied) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.notPlaying.title", locale)(),
			description: {
				toCheck: client.localise("music.strings.notPlaying.description.toCheck", locale)(),
			},
		};

		await client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description.toCheck,
					color: constants.colours.dullYellow,
				},
			],
		});

		return;
	}

	const [events, queue] = [musicService.events, musicService.queue];
	if (events === undefined || queue === undefined) {
		return;
	}

	const strings = {
		queue: client.localise("music.options.queue.strings.queue", locale)(),
	};

	// TODO(vxern): This may not display the updated listings on history change.
	const viewComponent = new SongListingView(client, {
		interaction,
		title: `${constants.emojis.music.list} ${strings.queue}`,
		listings: queue,
	});

	const refreshViewComponent = async () => viewComponent.refresh();
	const closeViewComponent = async () => viewComponent.close();

	events.on("queueUpdate", refreshViewComponent);
	events.on("stop", closeViewComponent);

	setTimeout(() => {
		events.off("queueUpdate", refreshViewComponent);
		events.off("stop", closeViewComponent);
	}, constants.INTERACTION_TOKEN_EXPIRY);

	await viewComponent.open();
}

export { handleDisplayPlaybackQueue };
