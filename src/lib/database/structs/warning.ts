import Fauna from "fauna";

/** Represents a warning given to a user. */
interface Warning {
	/** Unix timestamp of the creation of this warning document. */
	createdAt: number;

	/** The document reference to the user that gave this warning. */
	author: Fauna.values.Ref;

	/** The document reference to the user that this warning was given to. */
	recipient: Fauna.values.Ref;

	/** The reason for this warning. */
	reason: string;
}

export type { Warning };
