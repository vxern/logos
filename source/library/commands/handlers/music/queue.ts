import type { Client } from "logos/client";
import { SongListingView } from "logos/commands/components/paginated-views/song-listing-view";

async function handleDisplayPlaybackQueue(client: Client, interaction: Logos.Interaction): Promise<void> {
	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canCheckPlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const strings = constants.contexts.notPlayingMusicToCheck({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const strings = constants.contexts.queue({
		localise: client.localise.bind(client),
		locale: interaction.parameters.show ? interaction.guildLocale : interaction.locale,
	});

	const view = new SongListingView(client, {
		interaction,
		title: `${constants.emojis.music.list} ${strings.queue}`,
		listings: musicService.session.listings.queue.listings,
	});

	const refreshView = async () => view.refresh();
	const closeView = async () => view.close();

	musicService.session.listings.on("queue", refreshView);
	musicService.session.on("end", closeView);

	setTimeout(() => {
		musicService.session.listings.off("queue", refreshView);
		musicService.session.off("end", closeView);
	}, constants.INTERACTION_TOKEN_EXPIRY);

	await view.open();
}

export { handleDisplayPlaybackQueue };
