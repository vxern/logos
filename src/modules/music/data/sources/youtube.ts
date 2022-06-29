import { Video, YouTube } from 'https://deno.land/x/youtube_sr@v4.1.17/mod.ts';
import configuration from '../../../../configuration.ts';
import { SongListing } from '../song-listing.ts';
import { ListingResolver } from './sources.ts';

const videoExpression = new RegExp(
	/^(?:https?:)?(?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9\_-]{7,15})(?:[\?&][a-zA-Z0-9\_-]+=[a-zA-Z0-9\_-]+)*$/,
);

const resolver: ListingResolver = async (interaction, option) => {
	if (option.name !== 'url') {
		const videos = await YouTube.search(option.value, {
			limit: 10,
			type: 'video',
			safeSearch: true,
		});

		if (videos.length === 0) return undefined;

		// TODO(vxern): Allow the user to pick the specific video using a selection menu.

		return fromYouTubeVideo(videos[0]!, interaction.user.id);
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

		return {
			type: 'SONG_COLLECTION',
			source: 'YouTube',
			requestedBy: interaction.user.id,
			content: {
				title: playlist.title!,
				songs: playlist.videos.map((video) => ({
					title: video.title!,
					url: video.url!,
					duration: video.duration,
				})),
				position: -1,
			},
		};
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
): SongListing {
	return {
		type: 'SONG',
		source: 'YouTube',
		requestedBy: requestedBy,
		content: {
			title: video.title!,
			url: video.url!,
			duration: video.duration,
		},
	};
}

export default resolver;
