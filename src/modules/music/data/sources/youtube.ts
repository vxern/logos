import {
	Playlist,
	Video,
	YouTube,
} from 'https://deno.land/x/youtube_sr@v4.1.17/mod.ts';
import {
	InteractionResponseType,
	InteractionType,
	MessageComponentInteraction,
	MessageComponentType,
} from '../../../../../deps.ts';
import configuration from '../../../../configuration.ts';
import { createInteractionCollector, trim } from '../../../../utils.ts';
import { SongListing } from '../song-listing.ts';
import { ListingResolver } from './sources.ts';

const videoExpression = new RegExp(
	/^(?:https?:)?(?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9\_-]{7,15})(?:[\?&][a-zA-Z0-9\_-]+=[a-zA-Z0-9\_-]+)*$/,
);

const resolver: ListingResolver = async (client, interaction, option) => {
	if (option.name !== 'url') {
		const results = <(Video | Playlist)[]> await YouTube.search(option.value, {
			limit: 20,
			type: 'all',
			safeSearch: false,
		}).then((result) =>
			result.filter((element) =>
				element.type === 'video' || element.type === 'playlist'
			)
		);
		if (results.length === 0) return undefined;

		const [collector, customID] = createInteractionCollector(client, {
			type: InteractionType.MESSAGE_COMPONENT,
			user: interaction.user,
		});

		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Select a song / song collection',
				description: 'Select a song or song collection from the choices below.',
				color: configuration.interactions.responses.colors.blue,
			}],
			components: [{
				type: MessageComponentType.ACTION_ROW,
				components: [{
					type: MessageComponentType.SELECT,
					customID: customID,
					minValues: 1,
					maxValues: 1,
					options: results.map((result, index) => ({
						emoji: {
							name: result.type === 'video'
								? configuration.music.symbols.song
								: configuration.music.symbols.collection,
						},
						label: trim(result.title!, 100),
						value: index.toString(),
					})),
				}],
			}],
		});

		const selection =
			<MessageComponentInteraction> (await collector.waitFor('collect'))[0];

		collector.end();

		selection.respond({
			type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE,
		});

		const index = Number(<string> selection.data.values![0]!);
		const result = results[index]!;
		if (result.type === 'video') {
			return fromYouTubeVideo(result, interaction.user.id);
		}

		const playlist = await YouTube.getPlaylist(result.url!);
		return fromYouTubePlaylist(playlist, interaction.user.id);
	}

	if (!videoExpression.exec(option.value)) {
		interaction.respond({
			embeds: [{
				title: 'The URL is invalid',
				description: 'The provided link is not of a valid YouTube URL format.',
				color: configuration.interactions.responses.colors.red,
			}],
			ephemeral: true,
		});
		return undefined;
	}

	if (option.value!.includes('list')) {
		const playlist = await YouTube.getPlaylist(option.value);

		if (!playlist.id) return undefined;

		return fromYouTubePlaylist(playlist, interaction.user.id);
	}

	const video = await YouTube.getVideo(option.value);

	return fromYouTubeVideo(video, interaction.user.id);
};

/**
 * Creates a song listing from a YouTube video.
 */
function fromYouTubeVideo(
	video: Video,
	requestedBy: string,
): SongListing | undefined {
	if (!video.id) return undefined;

	return {
		source: 'YouTube',
		requestedBy: requestedBy,
		content: {
			type: 'SONG',
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
	requestedBy: string,
): SongListing | undefined {
	if (!playlist.id) return undefined;

	return {
		source: 'YouTube',
		requestedBy: requestedBy,
		content: {
			type: 'COLLECTION',
			title: playlist.title!,
			songs: playlist.videos.map((video) => ({
				type: 'SONG',
				title: video.title!,
				url: video.url!,
				duration: video.duration,
			})),
			position: -1,
		},
	};
}

export default resolver;
