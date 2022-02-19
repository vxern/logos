import { Song } from './song.ts';

/**
 * A representation of a collection of songs, which occupies a single place in
 * music queues, but contains multiple, playable songs which would normally each
 * occupy a separate place in the queue.
 */
interface SongCollection {
	/** The title of the collection. */
	title: string;
	/** The songs in the collection. */
	songs: Song[];
	/** The index of the song which is currently playing. */
	position: number;
}

export type { SongCollection };
