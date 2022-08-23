import { SongListingContentTypes } from './song-listing.ts';

/** Represents a musical piece in stream format. */
interface SongStream {
	type: SongListingContentTypes.Stream;

	/** The title of the stream. */
	title: string;

	/** The link to the stream. */
	url: string;
}

export type { SongStream };
