/** Represents a musical piece, playable singly by the music controller. */
interface Song {
	type: SongListingContentTypes.Song;

	/** The title of the song. */
	title: string;

	/** The link to the song. */
	url: string;

	/** The duration of the song in seconds. */
	duration: number;
}

/**
 * Represents a collection of songs that occupies a single position in music
 * queues, but contains multiple, playable songs that would normally each
 * occupy a separate place in the queue.
 */
interface SongCollection {
	type: SongListingContentTypes.Collection;

	/** The title of the collection. */
	title: string;

	/** The index of the song that is currently playing. */
	position: number;

	/** The songs in the collection. */
	songs: Song[];
}

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

/** Represents a musical piece in stream format. */
interface SongStream {
	type: SongListingContentTypes.External;

	/** The title of the stream. */
	title: string;

	/** The link to the stream. */
	url: string;
}

export { SongListingContentTypes };
export type { Song, SongCollection, SongListing, SongStream };
