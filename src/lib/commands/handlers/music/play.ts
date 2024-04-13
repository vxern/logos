import { Client } from "logos/client";
import resolvers from "logos/commands/resolvers";
import { SongListingResolver } from "logos/commands/resolvers/resolver";
import { AudioStream, MusicService, SongListing } from "logos/services/music";

async function handleRequestStreamPlayback(
	client: Client,
	interaction: Logos.Interaction<any, { url: string }>,
): Promise<void> {
	const locale = interaction.locale;

	await client.acknowledge(interaction);

	const strings = {
		stream: client.localise("music.options.play.strings.stream", locale)(),
	};

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

	const isVoiceStateVerified = verifyCanRequestPlayback(client, interaction, { musicService });
	if (!isVoiceStateVerified) {
		return;
	}

	const listing = await resolveToSongListing(client, interaction, { query: interaction.parameters.query });

	await handleRequestPlayback(client, interaction, listing);
}

async function handleRequestPlayback(
	client: Client,
	interaction: Logos.Interaction,
	listing: SongListing | undefined,
): Promise<void> {
	const locale = interaction.locale;

	if (listing === undefined) {
		const strings = {
			title: client.localise("music.options.play.strings.notFound.title", locale)(),
			description: {
				notFound: client.localise("music.options.play.strings.notFound.description.notFound", locale)(),
				tryDifferentQuery: client.localise(
					"music.options.play.strings.notFound.description.tryDifferentQuery",
					locale,
				)(),
			},
		};

		await client.warning(interaction, {
			title: strings.title,
			description: `${strings.description.notFound}\n\n${strings.description.tryDifferentQuery}`,
		});

		return;
	}

	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = verifyCanRequestPlayback(client, interaction, { musicService });
	if (!isVoiceStateVerified) {
		return;
	}

	const voiceState = guild.voiceStates.get(interaction.user.id);
	const channelId = voiceState?.channelId;
	if (channelId === undefined) {
		return;
	}

	await musicService.receiveNewListing(listing, channelId);
}

function verifyCanRequestPlayback(
	client: Client,
	interaction: Logos.Interaction,
	{ musicService }: { musicService: MusicService },
): boolean {
	const locale = interaction.locale;

	const isVoiceStateVerified = musicService.verifyVoiceState(interaction, "manage");
	if (!isVoiceStateVerified) {
		return false;
	}

	if (musicService.session.listings.queue.isFull) {
		const strings = {
			title: client.localise("music.options.play.strings.queueFull.title", locale)(),
			description: client.localise("music.options.play.strings.queueFull.description", locale)(),
		};

		client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return false;
	}

	return true;
}

export { handleRequestYouTubePlayback, handleRequestStreamPlayback };
