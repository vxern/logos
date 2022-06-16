import { Video, YouTube } from 'https://cdn.skypack.dev/youtube-sr@v4.0.1?dts';
import configuration from '../../../../configuration.ts';
import { MusicController } from '../../controller.ts';
import { SongListing } from '../song-listing.ts';
import { ListingResolver } from './sources.ts';

const resolver: ListingResolver = async (interaction, option) => {
	const requestedBy = interaction.user.id;
	// TODO(vxern): Synthesise a list of users who can manage the song.
	const managedBy: string[] = [];

	if (option.name === 'url') {
		if (!YouTube.validate(option.value, 'VIDEO')) {
			await interaction.respond({
				embeds: [{
					title: 'The URL is invalid.',
					description:
						'The provided link is not of a valid YouTube URL format.',
					color: configuration.interactions.responses.colors.red,
				}],
			});
			return undefined;
		}

		const video = await YouTube.getVideo(option.value);

		return fromYouTubeVideo(video, requestedBy, managedBy);
	}

	const videos = await YouTube.search(option.value, {
		limit: MusicController.limit,
		type: 'video',
		safeSearch: true,
	});

	if (videos.length === 0) return undefined;

	// TODO(vxern): Allow the user to pick the specific video using a selection menu.

	return fromYouTubeVideo(videos[0], requestedBy, managedBy);
};

/**
 * Creates a song listing from a YouTube video.
 */
function fromYouTubeVideo(
	video: Video,
	requestedBy: string,
	managedBy: string[],
): SongListing {
	return {
		source: 'YouTube',
		requestedBy: requestedBy,
		managedBy: managedBy,
		song: {
			title: video.title!,
			url: video.url,
			duration: video.duration,
		},
	};
}

export default resolver;
