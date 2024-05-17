import { trim } from "logos:core/formatting";
import type { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { Song, SongCollection, SongListing } from "logos/services/music";
import * as YouTubeSearch from "youtube-sr";

async function resolveYouTubeSongListings(
	client: Client,
	interaction: Logos.Interaction,
	{ query }: { query: string },
): Promise<SongListing | undefined> {
	if (!constants.patterns.youtubeUrl.test(query)) {
		return await search(client, interaction, query);
	}

	await client.acknowledge(interaction);

	if (query.includes("list=")) {
		const playlist = await YouTubeSearch.YouTube.getPlaylist(query);
		return getSongListingFromPlaylist(playlist, interaction.user.id);
	}

	const video = await YouTubeSearch.YouTube.getVideo(query);
	return getSongListingFromVideo(video, interaction.user.id);
}

async function search(client: Client, interaction: Logos.Interaction, query: string): Promise<SongListing | undefined> {
	const resultsAll = await YouTubeSearch.YouTube.search(query, { limit: 20, type: "all", safeSearch: false });
	const results = resultsAll.filter((element) => isPlaylist(element) || isVideo(element)) as Array<
		YouTubeSearch.Playlist | YouTubeSearch.Video
	>;
	if (results.length === 0) {
		return undefined;
	}

	const { promise, resolve } = Promise.withResolvers<SongListing | undefined>();

	const selectMenuSelection = new InteractionCollector(client, { only: [interaction.user.id], isSingle: true });

	selectMenuSelection.onInteraction(async (selection) => {
		await client.deleteReply(interaction);

		const indexString = selection.data?.values?.at(0) as string | undefined;
		if (indexString === undefined) {
			return resolve(undefined);
		}

		const index = Number(indexString);
		if (!Number.isSafeInteger(index)) {
			return resolve(undefined);
		}

		const result = results.at(index);
		if (result === undefined) {
			return resolve(undefined);
		}

		if (isPlaylist(result)) {
			const url = result.url;
			if (url === undefined) {
				return resolve(undefined);
			}

			const playlist = await YouTubeSearch.YouTube.getPlaylist(url);
			return resolve(getSongListingFromPlaylist(playlist, interaction.user.id));
		}

		return resolve(getSongListingFromVideo(result, interaction.user.id));
	});

	selectMenuSelection.onDone(() => resolve(undefined));

	await client.registerInteractionCollector(selectMenuSelection);

	const options = [];
	for (const [result, index] of results.map<[YouTubeSearch.Playlist | YouTubeSearch.Video, number]>(
		(result, index) => [result, index],
	)) {
		const title = result.title;
		if (title === undefined) {
			continue;
		}

		options.push({
			emoji: { name: isVideo(result) ? constants.emojis.music.song : constants.emojis.music.collection },
			label: trim(title, 100),
			value: index.toString(),
		});
	}

	const strings = constants.contexts.selectSong({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});
	await client.notice(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
			},
		],
		components: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						type: Discord.MessageComponentTypes.SelectMenu,
						customId: selectMenuSelection.customId,
						minValues: 1,
						maxValues: 1,
						options,
					},
				],
			},
		],
	});

	return promise;
}

type Result = YouTubeSearch.Playlist | YouTubeSearch.Video | YouTubeSearch.Channel;

function isPlaylist(result: Result): result is YouTubeSearch.Playlist {
	return result.type === "playlist";
}

function isVideo(result: Result): result is YouTubeSearch.Video {
	return result.type === "video";
}

function getSongListingFromPlaylist(playlist: YouTubeSearch.Playlist, requestedBy: bigint): SongListing | undefined {
	if (playlist.id === undefined) {
		return undefined;
	}

	const { title } = playlist;
	if (title === undefined) {
		return undefined;
	}

	const songs: Song[] = [];
	for (const video of playlist.videos) {
		const { title, url } = video;
		if (title === undefined || url === undefined) {
			continue;
		}

		songs.push(new Song({ title, url }));
	}

	return new SongListing({
		queueable: new SongCollection({ title, url: playlist.url!, songs }),
		userId: requestedBy,
	});
}

function getSongListingFromVideo(video: YouTubeSearch.Video, requestedBy: bigint): SongListing | undefined {
	if (video.id === undefined) {
		return undefined;
	}

	return new SongListing({ queueable: new Song({ title: video.title!, url: video.url! }), userId: requestedBy });
}

export { resolveYouTubeSongListings as resolveYouTubeListings };
