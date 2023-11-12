/** Represents a suggestion submitted for one of the guilds. */
interface Suggestion {
	id: string;

	/** The document reference to the author of this suggestion. */
	author: string;

	/** The ID of the guild this suggestion was submitted on. */
	guild: string;

	/** The suggestion form answers. */
	answers: {
		/** The suggestion. */
		suggestion: string;
	};

	/** Whether or not this suggestion has been resolved. */
	isResolved: boolean;

	/** Unix timestamp of the creation of this suggestion document. */
	createdAt: number;
}

export type { Suggestion };
