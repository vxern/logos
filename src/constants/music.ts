type SongListingType = "song" | "collection" | "stream";

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

	/** The content of this song listing. */
	content: Song | SongCollection | AudioStream;
}

/** Represents a musical piece in stream format. */
interface AudioStream {
	type: "stream";

	/** The title of the stream. */
	title: string;

	/** The link to the stream. */
	url: string;
}

function isSongCollection(object: Song | SongCollection | AudioStream): object is SongCollection {
	return object.type === "collection";
}

function isSongStream(object: Song | SongCollection | AudioStream): object is AudioStream {
	return object.type === "stream";
}

function isFirstInCollection(collection: SongCollection): boolean {
	return collection.position === 0;
}

function isLastInCollection(collection: SongCollection): boolean {
	return collection.position === collection.songs.length - 1;
}

export { isSongCollection, isSongStream, isFirstInCollection, isLastInCollection };
export type { Song, SongCollection, AudioStream, SongListing, SongListingType };
