import { SongListingContentTypes } from './mod.ts';

/** Represents a musical piece in stream format. */
interface SongStream {
	type: SongListingContentTypes.External;

	/** The title of the stream. */
	title: string;

	/** The link to the stream. */
	url: string;
}

export type { SongStream };
