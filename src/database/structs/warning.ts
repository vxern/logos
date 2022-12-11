import { Reference } from 'logos/src/database/document.ts';

/** Represents a warning given to a user. */
interface Warning {
	/** The document reference to the user that gave this warning. */
	author: Reference;

	/** The document reference to the user that this warning was given to. */
	recipient: Reference;

	/** The reason for this warning. */
	reason: string;
}

export type { Warning };
