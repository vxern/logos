/** Represents a warning given to a user. */
interface Warning {
	id: string;

	/** The document reference to the user that gave this warning. */
	author: string;

	/** The document reference to the user that this warning was given to. */
	recipient: string;

	/** The reason for this warning. */
	reason: string;

	/** Unix timestamp of the creation of this warning document. */
	createdAt: number;
}

export type { Warning };
