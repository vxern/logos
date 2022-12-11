import {
	ApplicationCommandFlags,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponentTypes,
	SelectOption,
	sendInteractionResponse,
} from 'discordeno';
import { Playlist, Video, YouTube } from 'youtube_sr';
import { ListingResolver } from 'logos/src/commands/music/data/sources/sources.ts';
import { SongListing, SongListingContentTypes } from 'logos/src/commands/music/data/types.ts';
import { Client } from 'logos/src/client.ts';
import { createInteractionCollector } from 'logos/src/interactions.ts';
import configuration from 'logos/configuration.ts';
import { trim } from 'logos/formatting.ts';

const urlExpression = new RegExp(
	/^(?:https?:)?(?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9\_-]{7,15})(?:[\?&][a-zA-Z0-9\_-]+=[a-zA-Z0-9\_-]+)*$/,
);

const resolver: ListingResolver = async (client, interaction, query) => {
	const urlExpressionExecuted = urlExpression.exec(query) ?? undefined;
	if (urlExpressionExecuted === undefined) {
		return search(client, interaction, query);
	}

	const url = urlExpressionExecuted.at(0)!;
	if (url.includes('&list=')) {
		const playlist = await YouTube.getPlaylist(query);
		return fromYouTubePlaylist(playlist, interaction.user.id);
	}

	const video = await YouTube.getVideo(query);
	return fromYouTubeVideo(video, interaction.user.id);
};

async function search(client: Client, interaction: Interaction, query: string): Promise<SongListing | undefined> {
	const results = await YouTube.search(
		query,
		{ limit: 20, type: 'all', safeSearch: false },
	).then(
		(result) => result.filter((element) => element.type === 'video' || element.type === 'playlist'),
	) as Array<Video | Playlist>;
	if (results.length === 0) return undefined;

	return new Promise<SongListing | undefined>((resolve) => {
		const customId = createInteractionCollector(
			client,
			{
				type: InteractionTypes.MessageComponent,
				userId: interaction.user.id,
				limit: 1,
				onCollect: async (bot, selection) => {
					sendInteractionResponse(bot, selection.id, selection.token, {
						type: InteractionResponseTypes.DeferredUpdateMessage,
					});

					const indexString = <string | undefined> selection.data?.values?.at(0);
					if (indexString === undefined) return resolve(undefined);

					const index = Number(indexString);
					if (isNaN(index)) return resolve(undefined);

					const result = results.at(index)!;
					if (result.type === 'video') {
						return resolve(fromYouTubeVideo(result, interaction.user.id));
					}

					const playlist = await YouTube.getPlaylist(result.url!);
					return resolve(fromYouTubePlaylist(playlist, interaction.user.id));
				},
			},
		);

		sendInteractionResponse(client.bot, interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: 'Select a song / song collection',
					description: 'Select a song or song collection from the choices below.',
					color: configuration.messages.colors.blue,
				}],
				components: [{
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.SelectMenu,
						customId: customId,
						minValues: 1,
						maxValues: 1,
						options: results.map<SelectOption>((result, index) => ({
							emoji: {
								name: result.type === 'video'
									? configuration.music.symbols[SongListingContentTypes.Song]
									: configuration.music
										.symbols[SongListingContentTypes.Collection],
							},
							label: trim(result.title!, 100),
							value: index.toString(),
						})),
					}],
				}],
			},
		});
	});
}

/**
 * Creates a song listing from a YouTube video.
 */
function fromYouTubeVideo(
	video: Video,
	requestedBy: bigint,
): SongListing | undefined {
	if (video.id === undefined) return undefined;

	return {
		source: 'YouTube',
		requestedBy: requestedBy,
		content: {
			type: SongListingContentTypes.Song,
			title: video.title!,
			url: video.url!,
			duration: video.duration,
		},
	};
}

/**
 * Creates a song listing from a YouTube playlist.
 */
function fromYouTubePlaylist(
	playlist: Playlist,
	requestedBy: bigint,
): SongListing | undefined {
	if (playlist.id === undefined) return undefined;

	return {
		source: 'YouTube',
		requestedBy: requestedBy,
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
