/** Represents a praise given by a user to another user. */
interface Praise {
	id: string;

	/** The document reference to the user that gave this praise. */
	sender: string;

	/** The document reference to the user that this praise was given to. */
	recipient: string;

	/** An optional comment attached to this praise. */
	comment?: string;

	/** Unix timestamp of the creation of this praise document. */
	createdAt: number;
}

export type { Praise };
