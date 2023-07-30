import constants from "../../../../../constants/constants";
import { trim } from "../../../../../formatting";
import { Client, localise } from "../../../../client";
import { createInteractionCollector, deleteReply, postponeReply, reply } from "../../../../interactions";
import { Song, SongListing } from "../types";
import { ListingResolver } from "./sources";
import * as Discord from "discordeno";
import * as YouTubeSearch from "youtube-sr";

const resolver: ListingResolver = async ([client, bot], interaction, query) => {
	const url = new RegExp(
		/^(?:https?:)?(?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9\_-]{7,15})(?:[\?&][a-zA-Z0-9\_-]+=[a-zA-Z0-9\_-]+)*$/,
	);

	if (!url.test(query)) {
		return search([client, bot], interaction, query);
	}

	postponeReply([client, bot], interaction);
	deleteReply([client, bot], interaction);

	if (query.includes("list=")) {
		const playlist = await YouTubeSearch.YouTube.getPlaylist(query);
		return fromYouTubePlaylist(playlist, interaction.user.id);
	}

	const video = await YouTubeSearch.YouTube.getVideo(query);
	return fromYouTubeVideo(video, interaction.user.id);
};

async function search(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	query: string,
): Promise<SongListing | undefined> {
	const resultsAll = await YouTubeSearch.YouTube.search(query, { limit: 20, type: "all", safeSearch: false });
	const results = resultsAll.filter((element) => isPlaylist(element) || isVideo(element)) as Array<
		YouTubeSearch.Playlist | YouTubeSearch.Video
	>;
	if (results.length === 0) {
		return undefined;
	}

	return new Promise<SongListing | undefined>((resolve) => {
		const customId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			userId: interaction.user.id,
			limit: 1,
			onCollect: async (bot, selection) => {
				deleteReply([client, bot], interaction);

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
			},
		});

		const strings = {
			title: localise(client, "music.options.play.strings.selectSong.title", interaction.locale)(),
			description: localise(client, "music.options.play.strings.selectSong.description", interaction.locale)(),
		};

		const options = [];
		for (const [result, index] of results.map<[YouTubeSearch.Playlist | YouTubeSearch.Video, number]>(
			(result, index) => [result, index],
		)) {
			const title = result.title;
			if (title === undefined) {
				continue;
			}

			options.push({
				emoji: { name: isVideo(result) ? constants.symbols.music.song : constants.symbols.music.collection },
				label: trim(title, 100),
				value: index.toString(),
			});
		}

		reply([client, bot], interaction, {
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
							customId: customId,
							minValues: 1,
							maxValues: 1,
							options,
						},
					],
				},
			],
		});
	});
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
