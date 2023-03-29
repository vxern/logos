import {
	ApplicationCommandFlags,
	Bot,
	deleteOriginalInteractionResponse,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponentTypes,
	SelectOption,
	sendInteractionResponse,
} from 'discordeno';
import { Channel, Playlist, Video, YouTube } from 'youtube';
import { ListingResolver } from 'logos/src/commands/music/data/sources/sources.ts';
import { SongListing, SongListingContentTypes } from 'logos/src/commands/music/data/types.ts';
import { Client, localise } from 'logos/src/client.ts';
import { createInteractionCollector } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { trim } from 'logos/formatting.ts';

const resolver: ListingResolver = async ([client, bot], interaction, query) => {
	const urlExpression = new RegExp(
		/^(?:https?:)?(?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9\_-]{7,15})(?:[\?&][a-zA-Z0-9\_-]+=[a-zA-Z0-9\_-]+)*$/,
	);

	const urlExpressionExecuted = urlExpression.exec(query) ?? undefined;
	if (urlExpressionExecuted === undefined) {
		return search([client, bot], interaction, query);
	}

	sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.DeferredChannelMessageWithSource,
	});

	deleteOriginalInteractionResponse(bot, interaction.token);

	const url = urlExpressionExecuted.at(0)!;
	if (url.includes('list=')) {
		const playlist = await YouTube.getPlaylist(query);
		return fromYouTubePlaylist(playlist, interaction.user.id);
	}

	const video = await YouTube.getVideo(query);
	return fromYouTubeVideo(video, interaction.user.id);
};

async function search(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	query: string,
): Promise<SongListing | undefined> {
	const resultsAll = await YouTube.search(query, { limit: 20, type: 'all', safeSearch: false });
	const results = resultsAll.filter((element) => isPlaylist(element) || isVideo(element)) as Array<Playlist | Video>;
	if (results.length === 0) return undefined;

	return new Promise<SongListing | undefined>((resolve) => {
		const customId = createInteractionCollector(
			[client, bot],
			{
				type: InteractionTypes.MessageComponent,
				userId: interaction.user.id,
				limit: 1,
				onCollect: async (bot, selection) => {
					sendInteractionResponse(bot, selection.id, selection.token, {
						type: InteractionResponseTypes.DeferredUpdateMessage,
					});

					const indexString = selection.data?.values?.at(0) as string | undefined;
					if (indexString === undefined) return resolve(undefined);

					const index = Number(indexString);
					if (isNaN(index)) return resolve(undefined);

					const result = results.at(index)!;
					if (isPlaylist(result)) {
						const playlist = await YouTube.getPlaylist(result.url!);
						return resolve(fromYouTubePlaylist(playlist, interaction.user.id));
					}

					return resolve(fromYouTubeVideo(result, interaction.user.id));
				},
			},
		);

		sendInteractionResponse(bot, interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: localise(client, 'music.options.play.strings.selectSong.header', interaction.locale)(),
					description: localise(client, 'music.options.play.strings.selectSong.body', interaction.locale)(),
					color: constants.colors.blue,
				}],
				components: [{
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.SelectMenu,
						customId: customId,
						minValues: 1,
						maxValues: 1,
						options: results.map<SelectOption>(
							(result, index) => ({
								emoji: {
									name: isVideo(result) ? constants.symbols.music.song : constants.symbols.music.collection,
								},
								label: trim(result.title!, 100),
								value: index.toString(),
							}),
						),
					}],
				}],
			},
		});
	});
}

type Result = Playlist | Video | Channel;

function isPlaylist(result: Result): result is Playlist {
	return result.type === 'playlist';
}

function isVideo(result: Result): result is Video {
	return result.type === 'video';
}

function fromYouTubeVideo(video: Video, requestedBy: bigint): SongListing | undefined {
	if (video.id === undefined) return undefined;

	return {
		source: 'YouTube',
		requestedBy,
		managerIds: [],
		content: {
			type: SongListingContentTypes.Song,
			title: video.title!,
			url: video.url!,
			duration: video.duration,
		},
	};
}

function fromYouTubePlaylist(playlist: Playlist, requestedBy: bigint): SongListing | undefined {
	if (playlist.id === undefined) return undefined;

	return {
		source: 'YouTube',
		requestedBy,
		managerIds: [],
		content: {
			type: SongListingContentTypes.Collection,
			title: playlist.title!,
			songs: playlist.videos.map((video) => ({
				type: SongListingContentTypes.Song,
				title: video.title!,
				url: video.url!,
				duration: video.duration,
			})),
			position: -1,
		},
	};
}

export default resolver;
