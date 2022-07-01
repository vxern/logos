/** Represents a musical piece in stream format. */
interface SongStream {
	type: 'STREAM';

	/** The title of the stream. */
	title: string;

	/** The link to the stream. */
	url: string;
}

export type { SongStream };
