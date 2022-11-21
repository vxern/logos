import { Reference } from 'logos/src/database/structs/mod.ts';

/** Represents a praise given by a user to another user. */
interface Praise {
	/** The document reference to the user that gave this praise. */
	author: Reference;

	/** The document reference to the user that this praise was given to. */
	subject: Reference;

	/** An optional comment attached to this praise. */
	comment?: string;
}

export type { Praise };
