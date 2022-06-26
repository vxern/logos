import { Video, YouTube } from 'https://deno.land/x/youtube_sr@v4.1.17/mod.ts';
import configuration from '../../../../configuration.ts';
import { SongListing } from '../song-listing.ts';
import { ListingResolver } from './sources.ts';

const resolver: ListingResolver = async (interaction, option) => {
	if (option.name === 'url') {
		if (!YouTube.validate(option.value, 'VIDEO')) {
			interaction.respond({
				embeds: [{
					title: 'The URL is invalid.',
					description:
						'The provided link is not of a valid YouTube URL format.',
					color: configuration.interactions.responses.colors.red,
				}],
				ephemeral: true,
			});
			return undefined;
		}

		const video = await YouTube.getVideo(option.value);

		return fromYouTubeVideo(video, interaction.user.id);
	}

	const videos = await YouTube.search(option.value, {
		limit: 10,
		type: 'video',
		safeSearch: true,
	});

	if (videos.length === 0) return undefined;

	// TODO(vxern): Allow the user to pick the specific video using a selection menu.

	return fromYouTubeVideo(videos[0]!, interaction.user.id);
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
