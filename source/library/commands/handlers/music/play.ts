import { Client } from "logos/client";
import resolvers from "logos/commands/resolvers";
import { SongListingResolver } from "logos/commands/resolvers/resolver";
import { AudioStream, SongListing } from "logos/services/music";

async function handleRequestStreamPlayback(
	client: Client,
	interaction: Logos.Interaction<any, { url: string }>,
): Promise<void> {
	await client.acknowledge(interaction);

	const strings = constants.contexts.stream({ localise: client.localise.bind(client), locale: interaction.locale });
	const listing: SongListing = new SongListing({
		queueable: new AudioStream({ title: strings.stream, url: interaction.parameters.url }),
		userId: interaction.user.id,
	});

	await handleRequestPlayback(client, interaction, listing);
}

async function handleRequestYouTubePlayback(client: Client, interaction: Logos.Interaction<any, { query: string }>) {
	await handleRequestQueryPlayback(client, interaction, resolvers.youtube);
}

async function handleRequestQueryPlayback(
	client: Client,
	interaction: Logos.Interaction<any, { query: string }>,
	resolveToSongListing: SongListingResolver,
): Promise<void> {
	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canManagePlayback(interaction) || !musicService.canRequestPlayback(interaction)) {
		return;
	}

	const listing = await resolveToSongListing(client, interaction, { query: interaction.parameters.query });
	if (listing === undefined) {
		const strings = constants.contexts.songNotFound({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: `${strings.description.notFound}\n\n${strings.description.tryDifferentQuery}`,
		});

		return;
	}

	await handleRequestPlayback(client, interaction, listing);
}

async function handleRequestPlayback(
	client: Client,
	interaction: Logos.Interaction,
	listing: SongListing,
): Promise<void> {
	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canManagePlayback(interaction) || !musicService.canRequestPlayback(interaction)) {
		return;
	}

	const voiceState = guild.voiceStates.get(interaction.user.id);
	const channelId = voiceState?.channelId;
	if (channelId === undefined) {
		return;
	}

	await musicService.receiveListing(listing, { channelId });
}

export { handleRequestYouTubePlayback, handleRequestStreamPlayback };
