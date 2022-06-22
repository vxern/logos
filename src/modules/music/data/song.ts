/** Represents of a musical piece, playable singly by the music controller. */
interface Song {
	/** The title of the song. */
	title: string;

	/** The link to the song. */
	url: string;

	/** The duration of the song in seconds. */
	duration: number;
}

export type { Song };
