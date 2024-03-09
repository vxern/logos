import * as YouTubeSearch from "youtube-sr";
import { trim } from "../../../../../formatting";
import { Client, InteractionCollector } from "../../../../client";
import { Song, SongListing } from "../types";
import { ListingResolver } from "./sources";

const resolver: ListingResolver = async (client, interaction, query) => {
	if (!constants.patterns.youtubeUrl.test(query)) {
		return search(client, interaction, query);
	}

	client.postponeReply(interaction);
	client.deleteReply(interaction);

	if (query.includes("list=")) {
		const playlist = await YouTubeSearch.YouTube.getPlaylist(query);
		return fromYouTubePlaylist(playlist, interaction.user.id);
	}

	const video = await YouTubeSearch.YouTube.getVideo(query);
	return fromYouTubeVideo(video, interaction.user.id);
};

async function search(client: Client, interaction: Logos.Interaction, query: string): Promise<SongListing | undefined> {
	const locale = interaction.locale;

	const resultsAll = await YouTubeSearch.YouTube.search(query, { limit: 20, type: "all", safeSearch: false });
	const results = resultsAll.filter((element) => isPlaylist(element) || isVideo(element)) as Array<
		YouTubeSearch.Playlist | YouTubeSearch.Video
	>;
	if (results.length === 0) {
		return undefined;
	}

	const { promise, resolve } = Promise.withResolvers<SongListing | undefined>();

	const selectMenuSelection = new InteractionCollector(client, { only: [interaction.user.id], isSingle: true });

	selectMenuSelection.onCollect(async (selection) => {
		client.deleteReply(interaction);

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
			return resolve(fromYouTubePlaylist(playlist, interaction.user.id));
		}

		return resolve(fromYouTubeVideo(result, interaction.user.id));
	});

	client.registerInteractionCollector(selectMenuSelection);

	const strings = {
		title: client.localise("music.options.play.strings.selectSong.title", locale)(),
		description: client.localise("music.options.play.strings.selectSong.description", locale)(),
	};

	const options = [];
	for (const [result, index] of results.map<[YouTubeSearch.Playlist | YouTubeSearch.Video, number]>((result, index) => [
		result,
		index,
	])) {
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

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
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

function fromYouTubeVideo(video: YouTubeSearch.Video, requestedBy: bigint): SongListing | undefined {
	if (video.id === undefined) {
		return undefined;
	}

	const { title, url, duration } = video;
	if (title === undefined || url === undefined) {
		return undefined;
	}

	return { source: "YouTube", requestedBy, managerIds: [], content: { type: "song", title, url, duration } };
}

function fromYouTubePlaylist(playlist: YouTubeSearch.Playlist, requestedBy: bigint): SongListing | undefined {
	if (playlist.id === undefined) {
		return undefined;
	}

	const { title } = playlist;
	if (title === undefined) {
		return undefined;
	}

	const tracks: Song[] = [];
	for (const video of playlist.videos) {
		const { title, url } = video;
		if (title === undefined || url === undefined) {
			continue;
		}

		tracks.push({ type: "song", title, url, duration: video.duration });
	}

	return {
		source: "YouTube",
		requestedBy,
		managerIds: [],
		content: { type: "collection", title, songs: tracks, position: -1 },
	};
}

export default resolver;
