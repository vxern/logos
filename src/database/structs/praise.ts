import { Reference } from 'logos/src/database/document.ts';

/** Represents a praise given by a user to another user. */
interface Praise {
	/** Unix timestamp of the creation of this praise document. */
	createdAt: number;

	/** The document reference to the user that gave this praise. */
	sender: Reference;

	/** The document reference to the user that this praise was given to. */
	recipient: Reference;

	/** An optional comment attached to this praise. */
	comment?: string;
}

export type { Praise };
