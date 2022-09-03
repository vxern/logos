import { SongCollection } from './song-collection.ts';
import { SongStream } from './song-stream.ts';
import { Song } from './song.ts';

enum SongListingContentTypes {
	Song,
	External,
	Collection,
}

/**
 * Represents a playable object in the form of a song or a collection of songs
 * that contains key information about the listing.
 */
interface SongListing {
	/** The source of the song listing. */
	source?: string;

	/** The ID of the user who requested the song listing. */
	requestedBy: bigint;

	/** The content of this song listing. */
	content: Song | SongCollection | SongStream;
}

export { SongListingContentTypes };
export type { SongListing };
