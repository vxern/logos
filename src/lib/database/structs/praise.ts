import Fauna from "fauna";

/** Represents a praise given by a user to another user. */
interface Praise {
	/** Unix timestamp of the creation of this praise document. */
	createdAt: number;

	/** The document reference to the user that gave this praise. */
	sender: Fauna.values.Ref;

	/** The document reference to the user that this praise was given to. */
	recipient: Fauna.values.Ref;

	/** An optional comment attached to this praise. */
	comment?: string;
}

export type { Praise };
