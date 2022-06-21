import { Song } from './song.ts';

/**
 * Represents a collection of songs that occupies a single position in music
 * queues, but contains multiple, playable songs that would normally each
 * occupy a separate place in the queue.
 */
interface SongCollection {
	/** The title of the collection. */
	title: string;

	/** The songs in the collection. */
	songs: Song[];

	/** The index of the song that is currently playing. */
	position: number;
}

export type { SongCollection };
