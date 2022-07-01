import { SongCollection } from './song-collection.ts';
import { SongStream } from "./song-stream.ts";
import { Song } from './song.ts';
import { Source } from './sources/sources.ts';

/**
 * Represents a playable object in the form of a song or a collection of songs
 * that contains key information about the listing.
 */
interface SongListing {
	/** The source of the song listing. */
	source: Source;

	/** The ID of the user who requested the song listing. */
	requestedBy: string;

	/** The content of this song listing. */
	content: Song | SongCollection | SongStream;
}

export type { SongListing };
