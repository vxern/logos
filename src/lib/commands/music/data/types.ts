type SongListingType = "song" | "collection" | "file";

/** Represents a musical piece, playable singly by the music controller. */
interface Song {
	type: "song";

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
	type: "collection";

	/** The title of the collection. */
	title: string;

	/** The index of the song that is currently playing. */
	position: number;

	/** The songs in the collection. */
	songs: Song[];
}

/**
 * Represents a playable object in the form of a song or a collection of songs
 * that contains key information about the listing.
 */
interface SongListing {
	/** The source of the song listing. */
	source?: string;

	/** The ID of the user who requested this song listing. */
	requestedBy: bigint;

	/**
	 * IDs of user who were present at the time of the addition of this song listing,
	 * and can therefore manage it.
	 */
	managerIds: bigint[];

	/** The content of this song listing. */
	content: Song | SongCollection | SongStream;
}

/** Represents a musical piece in stream format. */
interface SongStream {
	type: "file";

	/** The title of the stream. */
	title: string;

	/** The link to the stream. */
	url: string;
}

const listingTypeToEmoji = {
	song: constants.emojis.music.song,
	collection: constants.emojis.music.collection,
	file: constants.emojis.music.file,
} satisfies Record<SongListingType, string>;

export { listingTypeToEmoji, SongListingType };
export type { Song, SongCollection, SongListing, SongStream };
